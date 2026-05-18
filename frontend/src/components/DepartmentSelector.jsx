import { useState, useEffect } from 'react';
import { departmentApi } from '../services/api';
import { useAuthStore } from '../contexts/AuthContext';

const DEPARTMENTS = [
  { id: null, name: 'Todos os Setores' },
  { id: 1, name: 'Comercial' },
  { id: 2, name: 'Financeiro' },
  { id: 3, name: 'Secretaria' },
  { id: 4, name: 'Acadêmico' }
];

export default function DepartmentSelector({ value, onChange }) {
  const { user } = useAuthStore();
  const [departments, setDepartments] = useState(DEPARTMENTS);

  useEffect(() => {
    if (user?.company_id) {
      departmentApi.list(user.company_id)
        .then(res => {
          if (res.ok && res.data.length > 0) {
            setDepartments([{ id: null, name: 'Todos' }, ...res.data]);
          }
        })
        .catch(() => {});
    }
  }, [user?.company_id]);

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className="department-selector"
    >
      {departments.map((dept) => (
        <option key={dept.id ?? 'all'} value={dept.id ?? ''}>
          {dept.name}
        </option>
      ))}
    </select>
  );
}