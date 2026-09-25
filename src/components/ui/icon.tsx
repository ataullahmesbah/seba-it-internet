import {
  Activity, Award, BadgeCheck, Briefcase, Building2, Cable, Calendar, ChartColumn, CircleHelp, Clock, Cloud,
  CreditCard, Crown, FileText, Flame, Gamepad2, Gauge, Gift, Globe, GraduationCap, Handshake, Headphones, House,
  Landmark, Laptop, Layers, Lock, Mail, MapPin, MessageCircle, Monitor, Network, Phone, Receipt, Rocket, Router,
  Satellite, Server, Settings, Shield, ShieldCheck, Signal, Smartphone, Sparkles, Star, Target, Timer, TrendingUp,
  Tv, Users, Wifi, Wrench, Zap, type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  zap: Zap, wifi: Wifi, headphones: Headphones, "shield-check": ShieldCheck, gauge: Gauge, clock: Clock,
  rocket: Rocket, house: House, building: Building2, server: Server, network: Network, globe: Globe, cloud: Cloud,
  lock: Lock, users: Users, "map-pin": MapPin, phone: Phone, mail: Mail, "message-circle": MessageCircle,
  router: Router, cable: Cable, star: Star, award: Award, tv: Tv, gamepad: Gamepad2, crown: Crown, laptop: Laptop,
  smartphone: Smartphone, handshake: Handshake, "badge-check": BadgeCheck, activity: Activity, signal: Signal,
  layers: Layers, settings: Settings, wrench: Wrench, "credit-card": CreditCard, receipt: Receipt,
  "file-text": FileText, help: CircleHelp, timer: Timer, "trending-up": TrendingUp, chart: ChartColumn,
  sparkles: Sparkles, gift: Gift, shield: Shield, calendar: Calendar, target: Target, briefcase: Briefcase,
  "graduation-cap": GraduationCap, monitor: Monitor, satellite: Satellite, flame: Flame, landmark: Landmark,
};

export function Icon({ name, className, fallback = "wifi" }: { name?: string | null; className?: string; fallback?: string }) {
  const C = (name && MAP[name]) || MAP[fallback] || Wifi;
  return <C className={className} aria-hidden="true" />;
}
