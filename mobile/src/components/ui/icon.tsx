import {
  Accessibility,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  Award,
  Bell,
  Bookmark,
  Briefcase,
  Calendar,
  CalendarDays,
  Camera,
  ChartNoAxesColumnIncreasing,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Church,
  CircleDot,
  CircleHelp,
  CircleStop,
  ClipboardPen,
  Clock,
  Cloud,
  Cog,
  Compass,
  ConciergeBell,
  Crosshair,
  Crown,
  Delete,
  Diamond,
  DoorOpen,
  Download,
  Droplet,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Flag,
  Flower,
  Gift,
  Globe,
  GraduationCap,
  Grid,
  Heart,
  HeartPulse,
  Home,
  Image,
  Info,
  Leaf,
  Link,
  List,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Map,
  MapPin,
  MapPinOff,
  MapPinSearch,
  MapPinned,
  Maximize2,
  Medal,
  Menu,
  MessageCircle,
  Mic,
  Minus,
  Minimize2,
  Moon,
  MoreHorizontal,
  Music,
  MoreVertical,
  Mountain,
  Move,
  Navigation,
  Paperclip,
  Pause,
  Pencil,
  Phone,
  Play,
  Plus,
  Pentagon,
  Presentation,
  RefreshCw,
  Repeat,
  Ruler,
  Save,
  Search,
  Send,
  Settings,
  Share,
  Shuffle,
  SkipBack,
  SkipForward,
  Snowflake,
  SortAsc,
  Sparkles,
  Square,
  Star,
  Stethoscope,
  Sun,
  Tag,
  Target,
  Thermometer,
  Toilet,
  Trash2,
  Trees,
  TrendingUp,
  Trophy,
  Umbrella,
  Undo2,
  UtensilsCrossed,
  Unlock,
  Upload,
  User,
  UserPlus,
  Users,
  Video,
  Volume2,
  Wind,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/theme/tokens';
import type { IconName } from '@/types/icon';

/**
 * Catálogo de ícones.
 *
 * É `Record<IconName, LucideIcon>` e não `Record<string, …>`: a união de
 * `types/icon.ts` é a fonte da verdade, então um nome usado no app e ausente aqui
 * quebra o compilador em vez de renderizar `null`. Foi assim que apareceram os
 * ícones de alerta, de busca no mapa, de mapa indisponível e os de cadastro —
 * todos invisíveis até aqui.
 */
const iconMap: Record<IconName, LucideIcon> = {
  'wheelchair-accessibility': Accessibility,
  'alert-circle-outline': AlertCircle,
  'alert-outline': AlertTriangle,
  'bathroom': Toilet,
  'bathroom-accessible': Accessibility,
  'concierge-bell': ConciergeBell,
  'door': DoorOpen,
  'map-marker-question': CircleHelp,
  'medical-bag': Stethoscope,
  'presentation': Presentation,
  'ramp': TrendingUp,
  'signup': ClipboardPen,
  'stairs': ChartNoAxesColumnIncreasing,
  'user-plus': UserPlus,
  'map-marker-multiple-outline': MapPinned,
  'map-marker-off-outline': MapPinOff,
  'map-search-outline': MapPinSearch,
  'map-expand-outline': Maximize2,
  'map-collapse-outline': Minimize2,
  'arrow-left': ArrowLeft,
  'account-switch-outline': ArrowLeftRight,
  'arrow-right': ArrowRight,
  'award-outline': Award,
  'bell-outline': Bell,
  'bookmark-outline': Bookmark,
  'briefcase-outline': Briefcase,
  'calendar-blank-outline': Calendar,
  'calendar-month-outline': CalendarDays,
  'camera-outline': Camera,
  check: Check,
  'check-circle-outline': CheckCircle,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'record-circle-outline': CircleDot,
  'stop-circle-outline': CircleStop,
  'help-circle-outline': CircleHelp,
  'clock-outline': Clock,
  'cloud-outline': Cloud,
  'cog-outline': Cog,
  'compass-outline': Compass,
  'crosshairs-outline': Crosshair,
  'crown-outline': Crown,
  'delete-outline': Delete,
  'diamond-outline': Diamond,
  'download-outline': Download,
  'droplet-outline': Droplet,
  'edit-outline': Edit,
  entrance: DoorOpen,
  exit: LogOut,
  'external-link-outline': ExternalLink,
  'eye-outline': Eye,
  'eye-off-outline': EyeOff,
  'filter-outline': Filter,
  'flag-outline': Flag,
  'flower-outline': Flower,
  'gift-outline': Gift,
  'globe-outline': Globe,
  'grid-outline': Grid,
  'heart-outline': Heart,
  'heart-plus-outline': HeartPulse,
  'home-outline': Home,
  'image-outline': Image,
  'information-outline': Info,
  'leaf-outline': Leaf,
  'link-outline': Link,
  'list-outline': List,
  'lock-outline': Lock,
  login: LogIn,
  'mail-outline': Mail,
  'map-outline': Map,
  'map-marker': MapPin,
  'map-marker-outline': MapPin,
  'map-pin-outline': MapPin,
  'map-marker-path': MapPinned,
  'medal-outline': Medal,
  'crosshairs-gps': Crosshair,
  diagnostics: AlertCircle,
  'dots-vertical': MoreVertical,
  elevator: ArrowUp,
  'human-handsup': Accessibility,
  'human-wheelchair': Accessibility,
  logout: LogOut,
  magnify: Search,
  'account-outline': User,
  user: User,
  church: Church,
  'dots-horizontal-circle-outline': MoreHorizontal,
  'graduation-cap-outline': GraduationCap,
  'school-outline': GraduationCap,
  'silverware-fork-knife': UtensilsCrossed,
  'vector-polyline': Pentagon,
  menu: Menu,
  'message-outline': MessageCircle,
  'mic-outline': Mic,
  minus: Minus,
  'music-note': Music,
  'music-note-outline': Music,
  'moon-outline': Moon,
  'more-horizontal': MoreHorizontal,
  'more-vertical': MoreVertical,
  'mountain-outline': Mountain,
  move: Move,
  'navigation-outline': Navigation,
  'paperclip-outline': Paperclip,
  'pause-outline': Pause,
  pencil: Pencil,
  'phone-outline': Phone,
  'play-outline': Play,
  plus: Plus,
  'vector-polygon': Pentagon,
  'refresh-outline': RefreshCw,
  'repeat-outline': Repeat,
  'ruler-outline': Ruler,
  'content-save-outline': Save,
  'search-outline': Search,
  'send-outline': Send,
  'settings-outline': Settings,
  'share-outline': Share,
  'shuffle-outline': Shuffle,
  'skip-backward-outline': SkipBack,
  'skip-forward-outline': SkipForward,
  'snowflake-outline': Snowflake,
  'sort-outline': SortAsc,
  square: Square,
  'star-four-points': Sparkles,
  'star-outline': Star,
  'sun-outline': Sun,
  'tag-outline': Tag,
  'target-outline': Target,
  'thermometer-outline': Thermometer,
  'trash-can-outline': Trash2,
  'tree-outline': Trees,
  'trophy-outline': Trophy,
  'umbrella-outline': Umbrella,
  undo: Undo2,
  'unlock-outline': Unlock,
  'upload-outline': Upload,
  'user-outline': User,
  'users-outline': Users,
  'video-outline': Video,
  'volume-outline': Volume2,
  'wind-outline': Wind,
  close: X,
  'zap-outline': Zap,
};

type MaterialCommunityIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * Nomes renderizados pelo Material Community Icons.
 *
 * Tem **precedência** sobre o `iconMap`: Entrada, Saída, Escada e Elevador só
 * existem aqui porque os pictogramas do Lucide para eles eram ambíguos (o de
 * escada parecia sinal de celular). As entradas correspondentes no `iconMap`
 * existem apenas para satisfazer o `Record<IconName, …>` e nunca são desenhadas.
 */
const materialCommunityIconMap: Partial<Record<IconName, MaterialCommunityIconName>> = {
  entrance: 'location-enter',
  exit: 'location-exit',
  elevator: 'elevator',
  stairs: 'stairs',
};

type IconProps = {
  name: IconName;
  /** Tamanho do ícone (padrão 20). */
  size?: number;
  /**
   * Cor do ícone. Recebe um token de cor literal do `tailwind.config.js`
   * (`content`, `muted`, `primary`…), nunca um hex escrito à mão — por isso este
   * componente concentra o único ponto do app que resolve token para valor de
   * estilo nativo.
   */
  color?: string;
  className?: string;
  accessibilityLabel?: string;
};

/** Ícone único do app: Lucide com stroke fino e delicado. */
export function Icon({
  name,
  size = 20,
  color = colors.content,
  className,
  accessibilityLabel,
}: IconProps) {
  if (name === 'wheelchair-accessibility' || name === 'human-wheelchair') {
    return (
      <MaterialCommunityIcons
        name="wheelchair-accessibility"
        size={size}
        color={color}
        accessibilityLabel={accessibilityLabel}
        aria-hidden={accessibilityLabel ? undefined : true}
      />
    );
  }

  const materialCommunityName = materialCommunityIconMap[name];
  if (materialCommunityName) {
    return (
      <MaterialCommunityIcons
        name={materialCommunityName}
        size={size}
        color={color}
        accessibilityLabel={accessibilityLabel}
        aria-hidden={accessibilityLabel ? undefined : true}
      />
    );
  }

  const LucideComponent = iconMap[name];
  if (!LucideComponent) {
    return null;
  }
  return (
    <LucideComponent
      size={size}
      color={color}
      strokeWidth={1.5}
      className={className}
      accessibilityLabel={accessibilityLabel}
      aria-hidden={accessibilityLabel ? undefined : true}
    />
  );
}

export type { IconName };
