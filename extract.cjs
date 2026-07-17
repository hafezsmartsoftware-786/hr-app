const fs = require('fs');
const code = fs.readFileSync('src/routes/admin.payroll.tsx', 'utf8');
const lines = code.split('\n');
const start = lines.findIndex(l => l.startsWith('type AdvRow = {'));
const content = lines.slice(start).join('\n');
const header = `import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { Save, FileUp, FileDown, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useI18n } from '@/lib/i18n';
import { getAdvancedPayrollSettings, saveAdvancedPayrollSettings, saveBulkAdvancedPayrollSettings } from '@/backend/functions/payroll-settings.functions';

export type AdvRow = {`;

const fixedContent = content.replace(/^type AdvRow = {/, header);

fs.writeFileSync('src/components/payroll/AdvancedSettingsTab.tsx', fixedContent);

const newLines = lines.slice(0, start);
newLines.splice(23, 0, `import { AdvancedSettingsTab } from '@/components/payroll/AdvancedSettingsTab';`);
fs.writeFileSync('src/routes/admin.payroll.tsx', newLines.join('\n'));
console.log('Extraction complete');
