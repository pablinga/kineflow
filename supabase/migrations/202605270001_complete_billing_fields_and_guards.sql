alter table public.profiles
  add column if not exists fecha_inicio_plan timestamptz,
  add column if not exists fecha_fin_plan timestamptz,
  add column if not exists mercadopago_subscription_id text,
  add column if not exists mercadopago_customer_id text;

alter table public.profiles
  drop constraint if exists profiles_estado_plan_check,
  add constraint profiles_estado_plan_check
  check (estado_plan in ('ACTIVO', 'PENDIENTE', 'VENCIDO', 'CANCELADO'));

update public.profiles
set
  plan = coalesce(plan, 'FREE'),
  estado_plan = coalesce(estado_plan, 'ACTIVO'),
  limite_pacientes = case
    when coalesce(plan, 'FREE') = 'FREE' then 5
    else coalesce(limite_pacientes, -1)
  end,
  cantidad_kinesiologos = case
    when coalesce(plan, 'FREE') = 'CLINICA' then greatest(coalesce(cantidad_kinesiologos, 2), 2)
    else 1
  end,
  fecha_inicio_plan = coalesce(fecha_inicio_plan, created_at);

create or replace function public.set_default_plan_values()
returns trigger
as $function$
begin
  new.plan = coalesce(new.plan, 'FREE');
  new.estado_plan = coalesce(new.estado_plan, 'ACTIVO');
  new.fecha_inicio_plan = coalesce(new.fecha_inicio_plan, now());

  if new.plan = 'FREE' then
    new.limite_pacientes = 5;
    new.cantidad_kinesiologos = 1;
  elsif new.plan = 'INDEPENDIENTE' then
    new.limite_pacientes = -1;
    new.cantidad_kinesiologos = 1;
  elsif new.plan = 'CLINICA' then
    new.limite_pacientes = -1;
    new.cantidad_kinesiologos = greatest(coalesce(new.cantidad_kinesiologos, 2), 2);
  end if;

  return new;
end;
$function$ language plpgsql;

create or replace function public.prevent_profile_billing_self_update()
returns trigger
as $function$
begin
  if auth.role() = 'authenticated' and auth.uid() = old.id and (
    new.plan is distinct from old.plan
    or new.estado_plan is distinct from old.estado_plan
    or new.limite_pacientes is distinct from old.limite_pacientes
    or new.cantidad_kinesiologos is distinct from old.cantidad_kinesiologos
    or new.fecha_inicio_plan is distinct from old.fecha_inicio_plan
    or new.fecha_fin_plan is distinct from old.fecha_fin_plan
    or new.mercadopago_subscription_id is distinct from old.mercadopago_subscription_id
    or new.mercadopago_customer_id is distinct from old.mercadopago_customer_id
  ) then
    raise exception 'Los campos del plan solo pueden modificarse desde el backend.';
  end if;

  return new;
end;
$function$ language plpgsql security definer set search_path = public;

drop trigger if exists prevent_profile_billing_self_update on public.profiles;
create trigger prevent_profile_billing_self_update
before update on public.profiles
for each row execute function public.prevent_profile_billing_self_update();

create or replace function public.enforce_patient_plan_limit()
returns trigger
as $function$
declare
  current_plan text;
  current_status text;
  patient_limit integer;
  active_patients integer;
begin
  select profiles.plan, profiles.estado_plan, profiles.limite_pacientes
    into current_plan, current_status, patient_limit
  from public.profiles
  where profiles.id = new.owner_id;

  if coalesce(current_status, 'ACTIVO') <> 'ACTIVO' then
    raise exception 'Tu plan no esta activo. Revisa la pantalla de planes para continuar.';
  end if;

  if coalesce(current_plan, 'FREE') = 'FREE' then
    select count(*)
      into active_patients
    from public.patients
    where owner_id = new.owner_id
      and status = 'active';

    if active_patients >= coalesce(patient_limit, 5) then
      raise exception 'El Plan Free permite hasta 5 pacientes. Para continuar, activa un plan pago.';
    end if;
  end if;

  return new;
end;
$function$ language plpgsql security definer set search_path = public;
