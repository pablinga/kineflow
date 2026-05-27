import type { LucideIcon } from "lucide-react";
import { Building2, UserRound, UsersRound } from "lucide-react";

export type CommercialPlan = "FREE" | "INDEPENDIENTE" | "CLINICA";
export type PlanStatus = "ACTIVO" | "PENDIENTE" | "VENCIDO" | "CANCELADO";

export type PlanDefinition = {
  id: CommercialPlan;
  name: string;
  price: string;
  priceAmount: number | null;
  limit: string;
  audience: string;
  features: string[];
  cta: string;
  href: string;
  recommended?: boolean;
  patientLimit: number | null;
  kinesiologistCount: number;
  icon: LucideIcon;
};

export const FREE_PATIENT_LIMIT = 5;
export const INDEPENDENT_PLAN_PRICE = 14900;
export const CLINIC_PLAN_PRICE_PER_KINESIOLOGIST = 9900;

export const plans: PlanDefinition[] = [
  {
    id: "FREE",
    name: "Plan Free",
    price: "Gratis",
    priceAmount: 0,
    limit: `Hasta ${FREE_PATIENT_LIMIT} pacientes`,
    audience: "Pensado para probar la plataforma",
    features: [
      "Gestion basica de pacientes",
      "Agenda simple",
      "Evoluciones basicas",
      "Acceso individual",
    ],
    cta: "Comenzar gratis",
    href: "/registro?plan=FREE",
    patientLimit: FREE_PATIENT_LIMIT,
    kinesiologistCount: 1,
    icon: UserRound,
  },
  {
    id: "INDEPENDIENTE",
    name: "Plan Independiente",
    price: `$${INDEPENDENT_PLAN_PRICE.toLocaleString("es-AR")}/mes`,
    priceAmount: INDEPENDENT_PLAN_PRICE,
    limit: "Pacientes ilimitados",
    audience: "Pensado para kinesiologos que trabajan solos",
    features: [
      "Agenda completa",
      "Pacientes ilimitados",
      "Historial y evolucion por paciente",
      "Control de turnos",
      "Seguimiento de asistencia/cancelaciones",
    ],
    cta: "Activar plan",
    href: "/registro?plan=INDEPENDIENTE",
    recommended: true,
    patientLimit: null,
    kinesiologistCount: 1,
    icon: UsersRound,
  },
  {
    id: "CLINICA",
    name: "Plan Clinica / Consultorio",
    price: `$${CLINIC_PLAN_PRICE_PER_KINESIOLOGIST.toLocaleString(
      "es-AR",
    )}/mes por kinesiologo`,
    priceAmount: CLINIC_PLAN_PRICE_PER_KINESIOLOGIST,
    limit: "Equipos profesionales",
    audience: "Pensado para consultorios con varios profesionales",
    features: [
      "Todo lo del plan independiente",
      "Multiples kinesiologos",
      "Agenda por profesional",
      "Vista general del consultorio",
      "Gestion de usuarios/roles",
      "Pacientes compartidos",
    ],
    cta: "Consultar / Contratar",
    href: "/registro?plan=CLINICA",
    patientLimit: null,
    kinesiologistCount: 2,
    icon: Building2,
  },
];

export const defaultPlan = {
  plan: "FREE" as CommercialPlan,
  estadoPlan: "ACTIVO" as PlanStatus,
  limitePacientes: FREE_PATIENT_LIMIT,
  cantidadKinesiologos: 1,
};

export function getPlanDefinition(plan: CommercialPlan) {
  return plans.find((item) => item.id === plan) ?? plans[0];
}

export function getPatientLimit(plan: CommercialPlan) {
  return getPlanDefinition(plan).patientLimit;
}
