
import { Project, ProjectStatus, Department, TeamMember } from './types';

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'DEPT-3', name: '財務部', color: '#0284c7', manager: '財務主管' },
  { id: 'DEPT-6', name: '業務部', color: '#ea580c', manager: '業務經理' },
  { id: 'DEPT-9', name: '琥凱爾工程 第四工程部', color: '#a855f7', manager: '工務主管' },
  { id: 'DEPT-10', name: '設計規劃部', color: '#10b981', manager: '設計總監' }
];

export const MOCK_PROJECTS: Project[] = [];

export const MOCK_TEAM_MEMBERS: TeamMember[] = [];
