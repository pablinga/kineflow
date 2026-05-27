import { NextResponse } from "next/server";
import { getMercadoPagoSubscription } from "@/lib/mercadopago";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import type { CommercialPlan } from "@/lib/plans";

function mapSubscriptionStatus(status: string) {
  if (status === "authorized") {
    return "ACTIVO";
  }

  if (status === "cancelled") {
    return "CANCELADO";
  }

  if (status === "paused") {
    return "VENCIDO";
  }

  return "PENDIENTE";
}

function parseExternalReference(reference: unknown) {
  if (typeof reference !== "string") {
    return null;
  }

  const [userId, plan] = reference.split(":");

  if (
    !userId ||
    (plan !== "INDEPENDIENTE" && plan !== "CLINICA")
  ) {
    return null;
  }

  return { userId, plan: plan as CommercialPlan };
}

export async function POST(request: Request) {
  // Antes de cobrar en produccion, validar la firma oficial del webhook con
  // MERCADOPAGO_WEBHOOK_SECRET segun la configuracion del panel de Mercado Pago.
  const body = await request.json().catch(() => ({}));
  const subscriptionId =
    body?.data?.id ?? body?.id ?? new URL(request.url).searchParams.get("id");

  if (!subscriptionId) {
    return NextResponse.json({ received: true });
  }

  const admin = getSupabaseAdminClient();

  if (!admin) {
    return NextResponse.json(
      {
        received: true,
        warning:
          "Webhook recibido, pero falta SUPABASE_SERVICE_ROLE_KEY para actualizar planes.",
      },
      { status: 202 },
    );
  }

  try {
    const subscription = await getMercadoPagoSubscription(subscriptionId);
    const parsed = parseExternalReference(subscription.external_reference);

    if (!parsed) {
      return NextResponse.json({ received: true });
    }

    const estadoPlan = mapSubscriptionStatus(subscription.status);
    const { error } = await admin
      .from("profiles")
      .update({
        plan: parsed.plan,
        estado_plan: estadoPlan,
        fecha_inicio_plan: new Date().toISOString(),
        fecha_fin_plan: null,
        mercadopago_subscription_id: subscription.id,
        mercadopago_customer_id:
          subscription.payer_id?.toString() ??
          subscription.payer_email ??
          null,
      })
      .eq("id", parsed.userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No pudimos procesar el webhook.",
      },
      { status: 500 },
    );
  }
}
