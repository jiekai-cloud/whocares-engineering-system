
import { Project, ProjectStatus, Department, TeamMember } from './types';

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'DEPT-1', name: '戰略指揮部', color: '#6366f1', manager: '總經理' },
  { id: 'DEPT-2', name: '人事行政部', color: '#64748b', manager: '行政主管' },
  { id: 'DEPT-3', name: '財務部', color: '#0284c7', manager: '財務主管' },
  { id: 'DEPT-4', name: '第一工程部', color: '#16a34a', manager: '工務主管' },
  { id: 'DEPT-5', name: '品質管理部', color: '#8b5cf6', manager: '品管主管' },
  { id: 'DEPT-6', name: '業務部', color: '#ea580c', manager: '業務經理' },
  { id: 'DEPT-7', name: '行銷部', color: '#ec4899', manager: '行銷經理' }
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'BNI202601001',
    departmentId: 'DEPT-6', // 業務部
    name: '台北信義室內裝修案',
    category: '室內裝修',
    source: 'BNI',
    client: '王先生',
    referrer: '網站預約',
    manager: '陳志明',
    startDate: '2026-01-10',
    endDate: '2026-05-30',
    createdDate: '2026-01-01',
    budget: 2500000,
    spent: 1200000,
    progress: 45,
    status: ProjectStatus.CONSTRUCTING,
    tasks: [],
    phases: [],
    financials: { labor: 35, material: 45, subcontractor: 15, other: 5 }
  },
  {
    id: 'CO202603001',
    departmentId: 'DEPT-6', // 業務部
    name: '台中商業辦公室擴建',
    category: '室內裝修',
    source: '企業',
    client: '科技公司',
    referrer: '舊客介紹',
    manager: '林靜宜',
    startDate: '2026-02-15',
    endDate: '2026-08-20',
    createdDate: '2026-01-20',
    budget: 8800000,
    spent: 2100000,
    progress: 15,
    status: ProjectStatus.CONSTRUCTING,
    tasks: [],
    phases: [],
    financials: { labor: 25, material: 55, subcontractor: 15, other: 5 }
  },
  {
    id: 'RE202604001',
    departmentId: 'DEPT-6', // 業務部
    name: '高雄住宅防水工程',
    category: '防水工程',
    source: '住宅',
    client: '李女士',
    referrer: '直客',
    manager: '郭俊宏',
    startDate: '2026-03-01',
    endDate: '2026-06-15',
    createdDate: '2026-02-15',
    budget: 1500000,
    spent: 0,
    progress: 0,
    status: ProjectStatus.NEGOTIATING,
    tasks: [],
    phases: [],
    financials: { labor: 40, material: 30, subcontractor: 20, other: 10 }
  }
];

export const MOCK_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'T-1',
    employeeId: 'ADM001',
    name: '李大維',
    role: '總經理',
    systemRole: 'SuperAdmin',
    departmentId: 'DEPT-1', // 戰略指揮部
    departmentIds: ['DEPT-1', 'DEPT-2'],
    phone: '0912-000-001',
    email: 'ceo@lifequality.ai',
    status: 'Available',
    activeProjectsCount: 2,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    specialty: ['企業管理', '戰略規劃'],
    certifications: ['PMP', '工地主任證照'],
    joinDate: '2020-01-01'
  },
  {
    id: 'T-2',
    employeeId: 'ENG001',
    name: '張家銘',
    role: '工地主任',
    systemRole: 'DeptAdmin',
    departmentId: 'DEPT-4', // 第一工程部
    departmentIds: ['DEPT-4'],
    phone: '0928-111-222',
    email: 'jm.chang@lifequality.ai',
    status: 'Busy',
    activeProjectsCount: 3,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    specialty: ['室內裝修', '水電配置'],
    certifications: ['乙級室內裝修工程管理'],
    joinDate: '2022-03-15'
  },
  {
    id: 'T-3',
    employeeId: 'AST001',
    name: '陳小美',
    role: '工地助理',
    systemRole: 'Staff',
    departmentId: 'DEPT-4', // 第一工程部
    departmentIds: ['DEPT-4'],
    phone: '0933-444-555',
    email: 'xm.chen@lifequality.ai',
    status: 'Available',
    activeProjectsCount: 1,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    specialty: ['現場紀錄', '物料清點'],
    certifications: ['職業安全衛生管理員'],
    joinDate: '2023-06-01'
  },
  {
    id: 'T-4',
    employeeId: 'ACC001',
    name: '王雪芬',
    role: '經理',
    systemRole: 'DeptAdmin',
    departmentId: 'DEPT-3', // 財務部
    departmentIds: ['DEPT-3'],
    phone: '0955-666-777',
    email: 'accounting@lifequality.ai',
    status: 'Available',
    activeProjectsCount: 0,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
    specialty: ['財務會計', '稅務申報'],
    certifications: ['記帳士', '會計師乙級'],
    joinDate: '2021-11-20'
  }
];
