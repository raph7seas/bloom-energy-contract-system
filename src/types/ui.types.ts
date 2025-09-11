export interface TabConfig {
  id: string;
  label: string;
  icon: any; // Lucide React icon component
  required?: boolean;
  readonly?: boolean;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: any;
  badge?: number | string;
  active?: boolean;
}

export interface FilterConfig {
  clients: string[];
  statuses: string[];
  types: string[];
  dateRange: {
    start: string;
    end: string;
  };
}

export interface SearchConfig {
  query: string;
  filters: FilterConfig;
  sortBy: 'date' | 'client' | 'value' | 'capacity';
  sortOrder: 'asc' | 'desc';
}

export interface DialogState {
  isOpen: boolean;
  title?: string;
  content?: any;
  data?: any;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
}

export interface LoadingState {
  [key: string]: boolean;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

// Theme and styling types
export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
    muted: string;
    accent: string;
    destructive: string;
  };
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface FormFieldProps extends BaseComponentProps {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export interface CardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export interface DataTableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T) => React.ReactNode;
}

export interface ActionButtonConfig {
  label: string;
  icon?: any;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

// Modal and dialog types
export interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface FormDialogProps<T = any> {
  title: string;
  initialData?: T;
  onSubmit: (data: T) => void;
  onCancel: () => void;
  children: React.ReactNode;
}