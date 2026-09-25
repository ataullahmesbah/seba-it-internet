import {
  Bell, Briefcase, Building2, CircleHelp, CreditCard, FileText, House, Image as ImageIcon, Inbox, KeyRound, Landmark,
  LayoutDashboard, Mail, Map, MapPin, Menu, MessagesSquare, Newspaper, Package, Palette, ScrollText, Search, Settings,
  Star, Tag, Users, type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard, inbox: Inbox, building: Building2, mail: Mail, "map-pin": MapPin,
  messages: MessagesSquare, bell: Bell, home: House, "file-text": FileText, package: Package, briefcase: Briefcase,
  map: Map, tag: Tag, "credit-card": CreditCard, help: CircleHelp, star: Star, newspaper: Newspaper, landmark: Landmark,
  image: ImageIcon, palette: Palette, menu: Menu, search: Search, settings: Settings, users: Users, key: KeyRound, scroll: ScrollText,
};

export function AdminIcon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const C = MAP[name] ?? FileText;
  return <C className={className} aria-hidden />;
}
