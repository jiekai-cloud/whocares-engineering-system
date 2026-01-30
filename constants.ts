
import { Project, ProjectStatus, Department, TeamMember } from './types';

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'DEPT-1', name: '戰略指揮部', color: '#6366f1', manager: '總經理' },
  { id: 'DEPT-2', name: '人事行政部', color: '#64748b', manager: '行政主管' },
  { id: 'DEPT-3', name: '財務部', color: '#0284c7', manager: '財務主管' },
  { id: 'DEPT-4', name: '生活品質 第一工程部', color: '#16a34a', manager: '工務主管' },
  { id: 'DEPT-5', name: '品質管理部', color: '#8b5cf6', manager: '品管主管' },
  { id: 'DEPT-6', name: '業務部', color: '#ea580c', manager: '業務經理' },
  { id: 'DEPT-7', name: '行銷部', color: '#ec4899', manager: '行銷經理' },
  { id: 'DEPT-8', name: '傑凱工程 第三工程部', color: '#0ea5e9', manager: '工務主管' },
  { id: 'DEPT-9', name: '琥凱爾工程 第四工程部', color: '#a855f7', manager: '工務主管' }
];

export const MOCK_PROJECTS: Project[] = [];

export const MOCK_TEAM_MEMBERS: TeamMember[] = [];
