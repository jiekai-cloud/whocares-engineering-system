
export enum ProjectStatus {
  NEGOTIATING = '洽談中',
  QUOTING = '報價中',
  QUOTED = '已報價',
  WAITING_SIGN = '待簽約',
  SIGNED_WAITING_WORK = '已簽約待施工',
  CONSTRUCTING = '施工中',
  COMPLETED = '已完工',
  INSPECTION = '驗收中',
  CLOSED = '結案',
  CANCELLED = '撤案',
  LOST = '未成交'
}

export type ProjectCategory = '室內裝修' | '建築營造' | '水電機電' | '防水工程' | '補強工程' | '其他';

export type ProjectSource =
  | 'BNI'
  | '台塑集團'
  | '士林電機'
  | '信義居家'
  | '企業'
  | '新建工程'
  | '網路客'
  | '住宅'
  | '台灣美光晶圓'
  | 'AI會勘系統'
  | 'JW';

export interface Expense {
  id: string;
  date: string;
  name: string;
  category: '委託工程' | '零用金' | '機具材料' | '行政人事成本' | '其他';
  amount: number;
  status: '待審核' | '已核銷' | '已撥款';
  supplier?: string;
}

export interface WorkAssignment {
  id: string;
  date: string;
  memberId: string;
  memberName: string;
  wagePerDay: number;
  days: number;
  totalCost: number;
  isSpiderMan?: boolean; // 新增：是否為蜘蛛人作業（繩索吊掛作業）
}

export interface Department {
  id: string;
  name: string;
  color: string;
  manager: string;
}

export interface Task {
  id: string;
  title: string;
  assignee: string;
  status: 'Todo' | 'Doing' | 'Done';
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
}

export interface ProjectPhase {
  id: string;
  name: string;
  status: 'Completed' | 'Current' | 'Upcoming';
  progress: number;
  startDate: string;
  endDate: string;
}

export interface ProjectFinancials {
  labor: number;
  material: number;
  subcontractor: number;
  other: number;
}

export interface ProjectComment {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorRole: string;
  text: string;
  timestamp: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  action: string;
  targetId: string;
  targetName: string;
  timestamp: string;
  type: 'project' | 'customer' | 'team' | 'system';
  isRead?: boolean;
}

export interface ChecklistTask {
  id: string;
  title: string;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  isDone: boolean;
}

export interface PaymentStage {
  id: string;
  label: string;
  amount: number;
  date: string;
  notes: string;
  vendorId?: string;
}

export interface Vendor {
  id: string;
  name: string;
  type: string;
  contact: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  specialty?: string[];
  rating: number;
  notes?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface DailyLogEntry {
  id: string;
  date: string;
  content: string;
  photoUrls: string[];
  authorId: string;
  authorName: string;
  authorAvatar: string;
}

export interface ProjectFile {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video' | 'pdf' | 'other';
  uploadedAt: string;
  uploadedBy: string;
  category?: string;
}

export interface PreConstructionPrep {
  materialsAndTools?: string;
  notice?: string;
  scopeDrawingUrl?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  departmentId: string;
  name: string;
  category: ProjectCategory;
  source: ProjectSource;
  client: string;
  referrer: string;
  quotationManager: string; // 報價負責人
  engineeringManager: string; // 工程負責人
  introducer?: string; // 介紹人
  introducerFeeRequired?: boolean; // 是否需要介紹費
  introducerFeeAmount?: number; // 介紹費金額
  startDate: string;
  endDate: string;
  createdDate: string;
  budget: number;
  spent: number;
  progress: number;
  status: ProjectStatus;
  tasks: Task[];
  phases: ProjectPhase[];
  dailyLogs?: DailyLogEntry[];
  checklist?: ChecklistTask[];
  payments?: PaymentStage[];
  financials: ProjectFinancials;
  location?: ProjectLocation;
  preConstruction?: PreConstructionPrep;
  inspectionData?: {
    diagnosis: string;
    suggestedFix: string;
    originalPhotos: string[];
    aiAnalysis: string;
    timestamp: string;
  };
  lossReason?: string;
  comments?: ProjectComment[];
  expenses?: Expense[];
  workAssignments?: WorkAssignment[];
  files?: ProjectFile[];
  contractUrl?: string; // 合約或報價單
  defectRecords?: DefectRecord[]; // 缺失改善紀錄
  year?: string; // 新增：手動指定的年度類別 (2024, 2025, 2026)
  statusChangedAt?: string; // 狀態變更時間 (用於逾期計算)
  updatedAt?: string;
  deletedAt?: string;
  isPurged?: boolean;
}

export interface DefectItem {
  id: string;
  content: string; // 缺失項目
  status: 'Pending' | 'Completed'; // 待改進 | 已改進
  improvement?: string; // 改善情形
  photos?: string[]; // 缺失或改善照片 (Base64 or URL)
  videoUrl?: string; // 影片記錄 (Base64 or URL)
}


export interface DefectRecord {
  id: string;
  date: string;
  items: DefectItem[];
  suggestions?: string; // 後續會議建議
  updatedAt: string;
}

export interface Lead {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  diagnosis: string;
  photos: string[];
  timestamp: string;
  status: 'new' | 'contacted' | 'converted';
  updatedAt?: string;
  deletedAt?: string;
}

export interface Customer {
  id: string;
  departmentId: string;
  name: string;
  contactPerson: string;
  secondaryContact?: string; // 新增：第二聯絡人
  phone: string;
  landline?: string; // 新增：室內電話
  fax?: string; // 新增：傳真
  secondaryPhone?: string; // 備用電話
  email: string;
  address: string;
  birthday?: string; // 生日
  occupation?: string; // 職業
  source?: string; // 來源 (例如：FB, 官網, 介紹)
  lineId?: string; // Line ID
  preferredContactMethod?: 'Phone' | 'Email' | 'Line'; // 首選聯繫方式
  type: '個人' | '企業' | '政府單位' | '長期夥伴';
  createdDate: string;
  taxId?: string;
  notes?: string; // 客戶備註
  tags?: string[]; // 標籤
  updatedAt?: string;
  deletedAt?: string;
}

export interface TeamMember {
  id: string;
  employeeId: string;
  password?: string;
  departmentId: string;
  departmentIds?: string[]; // 支持多部門 (最多三個)
  name: string;
  nicknames?: string[]; // 新增：多個外號 (用於 AI 辨識)
  dailyRate?: number; // 新增：日薪 (用於成本計算)
  spiderManAllowance?: number; // 新增：蜘蛛人津貼 (繩索吊掛作業額外津貼)
  role: '總經理' | '副總經理' | '總經理特助' | '經理' | '副經理' | '專案經理' | '工地主任' | '工地助理' | '工務主管' | '現場工程師' | '行政助理' | '助理' | '設計師' | '工頭' | '外部協力' | '財務部經理';
  systemRole: 'SuperAdmin' | 'DeptAdmin' | 'Staff' | 'Guest' | 'SyncOnly'; // 新增系統權限 (SyncOnly 僅供初始化同步)
  phone: string;
  personalPhone?: string; // 個人電話
  email: string;
  birthday?: string;
  joinDate?: string;
  certifications?: string[];
  address?: string;
  bankInfo?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  specialty: string[];
  status: 'Available' | 'Busy' | 'OnLeave';
  activeProjectsCount: number;
  avatar: string;
  updatedAt?: string;
  deletedAt?: string;
}

export type Role = 'SuperAdmin' | 'Admin' | 'Manager' | 'Staff' | 'Guest' | 'SyncOnly' | 'DeptAdmin';

export type SystemContext = 'FirstDept' | 'ThirdDept'; // 第一工程部 | 第三工程部

export interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
  role: Role;
  roleName?: string; // 自訂職稱 (e.g. 工務經理)
  department: SystemContext;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export type InventoryCategory = '材料' | '工具' | '設備' | '其他';

export interface InventoryItem {
  id: string;
  name: string;
  simpleName?: string; // 簡稱
  sku?: string; // 料號
  barcode?: string; // 條碼編號 / 資產標籤
  category: InventoryCategory;
  quantity: number;
  unit: string;
  locations: { name: string; quantity: number }[]; // 多地點庫存皆可追蹤
  // location?: string; // @deprecated Use locations instead
  minLevel?: number; // 安全庫存量
  costPrice?: number; // 成本價
  sellingPrice?: number; // 建議售價
  supplier?: string;
  status: 'Normal' | 'Low' | 'Out';
  updatedAt?: string;
  deletedAt?: string;
  notes?: string;
  maintenanceRecords?: MaintenanceRecord[];
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  type: '維修' | '保養' | '檢測' | '其他';
  description: string;
  cost: number;
  performer: string; // 維修廠商或人員
  nextDate?: string; // 下次預計維修/保養日
  attachments?: string[]; // 照片或單據
}


export interface InventoryLocation {
  id: string;
  name: string;
  type: 'Main' | 'Temporary' | 'Project';
  description?: string;
  isDefault?: boolean; // Default location for new items
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'In' | 'Out' | 'Adjust' | 'Transfer' | 'Purchase';
  quantity: number;
  fromLocation?: string;
  toLocation?: string;
  date: string;
  performedBy: string; // User Name
  notes?: string;
  relatedProjectId?: string; // 關聯專案 ID (若是出庫到專案)
  relatedProjectName?: string;
}

export interface PurchaseOrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  cost: number;
  received: boolean;
}

export interface OrderPayment {
  id: string;
  date: string;
  amount: number;
  method: 'Cash' | 'Transfer' | 'Check' | 'CreditCard' | 'Other';
  note?: string;
}

export interface PurchaseOrder {
  id: string;
  date: string; // 訂購日期
  expectedDeliveryDate?: string;
  supplier: string;
  targetWarehouseId: string; // 預設入庫倉庫
  items: PurchaseOrderItem[];
  status: 'Pending' | 'Partial' | 'Completed' | 'Cancelled'; // 待出貨 | 部分到貨 | 已完成 | 取消
  payments: OrderPayment[];
  totalAmount: number;
  notes?: string;
  updatedAt?: string;
  createdAb?: string;
}
