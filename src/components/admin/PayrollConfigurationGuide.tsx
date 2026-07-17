import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function PayrollConfigurationGuide() {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-primary">
          <BookOpen className="h-4 w-4" />
          {isAr ? "دليل التهيئة" : "Configuration Guide"}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">
            {isAr ? "🇪🇬 دليل تهيئة الرواتب" : "🇪🇬 Egyptian Payroll Guide"}
          </SheetTitle>
          <SheetDescription>
            {isAr ? "تعرف على كيفية تهيئة نموذج التسوية الضريبية وسياسات الشركة." : "Learn how to configure the AFS model and company policies."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 text-sm text-foreground">
          {/* Section 1 */}
          <section className="space-y-3">
            <h3 className="font-semibold text-base text-primary">
              {isAr ? "1. إعدادات الرواتب العامة" : "1. Global Payroll Settings"}
            </h3>
            <p className="text-muted-foreground">
              {isAr ? "تنطبق هذه الإعدادات على جميع الموظفين بشكل عام." : "These settings apply to all employees globally."}
            </p>
            <ul className="list-disc pl-5 space-y-2 rtl:pl-0 rtl:pr-5">
              <li>
                <strong>{isAr ? "التأمينات الاجتماعية: " : "Social Insurance: "}</strong>
                {isAr ? "حدد نسبة الموظف والشركة، بالإضافة إلى الحد الأدنى والحد الأقصى للتأمينات." : "Define the Employee & Employer percentages, along with the Minimum (Floor) and Maximum (Ceiling) salary caps for insurance."}
              </li>
              <li>
                <strong>{isAr ? "صندوق الشهداء: " : "Martyrs Fund: "}</strong>
                {isAr ? "قم بتفعيل هذا الخيار لخصم النسبة القانونية لصندوق الشهداء من إجمالي الرواتب." : "Toggle this on to deduct the statutory Martyrs Fund percentage from employees' gross salaries."}
              </li>
              <li>
                <strong>{isAr ? "الإعفاء الشخصي السنوي: " : "Annual Personal Exemption: "}</strong>
                {isAr ? "حدد حد الإعفاء الضريبي السنوي المعتمد من مصلحة الضرائب المصرية." : "Set the yearly tax-free allowance defined by the Egyptian Tax Authority (e.g., 20,000 EGP)."}
              </li>
              <li>
                <strong>{isAr ? "الشرائح الضريبية: " : "Tax Brackets: "}</strong>
                {isAr ? "قم بتهيئة شرائح ونسب الضرائب التصاعدية. سيقوم النظام بحساب الضريبة الشهرية بناءً على الراتب السنوي وتقسيمها." : "Configure the progressive tax rates and bands. The system will annualize the salary, apply these brackets, and calculate the exact monthly tax."}
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h3 className="font-semibold text-base text-primary">
              {isAr ? "2. سياسات الشركة العامة" : "2. General Company Policies"}
            </h3>
            <ul className="list-disc pl-5 space-y-2 rtl:pl-0 rtl:pr-5">
              <li>
                <strong>{isAr ? "البدلات والمكافآت: " : "Allowances & Bonuses: "}</strong>
                {isAr ? "أضف مبالغ ثابتة أو متغيرة إلى إجمالي الراتب. وتخضع للضرائب بالكامل وفقاً للقانون المصري." : "Add fixed or variable amounts to the gross salary. They are fully taxable under standard Egyptian law."}
              </li>
              <li>
                <strong>{isAr ? "جزاءات الحضور: " : "Attendance Penalties: "}</strong>
                {isAr ? "يتم خصم التأخير والغياب المتتبع آلياً من صافي الراتب." : "Late arrivals or absences tracked by the attendance system automatically deduct from the net payout."}
              </li>
              <li>
                <strong>{isAr ? "السلف والأقساط: " : "Loans & Installments: "}</strong>
                {isAr ? "يتم خصم أقساط السلف النشطة تلقائياً كل شهر." : "Active employee loans are automatically deducted month-over-month."}
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h3 className="font-semibold text-base text-primary">
              {isAr ? "3. الإعدادات المتقدمة للموظف" : "3. Per-Employee Advanced Settings"}
            </h3>
            <p className="text-muted-foreground">
              {isAr ? "توجد في علامة التبويب " : "Found in the "}<strong>{isAr ? "الإعدادات المتقدمة" : "Advanced Settings"}</strong>{isAr ? " في شاشة الرواتب." : " tab on the Payroll screen."}
            </p>
            <ul className="list-disc pl-5 space-y-2 rtl:pl-0 rtl:pr-5">
              <li>
                <strong>{isAr ? "الدخل الخارجي والضريبة المسددة: " : "External Income & Tax Paid: "}</strong>
                {isAr ? "ضرورية للتسوية الضريبية للموظفين بدوام جزئي. يُضاف الدخل الخارجي للوعاء، وتُخصم الضريبة المسددة من الضريبة المحتسبة." : "Crucial for accurate tax reconciliation for employees working part-time elsewhere. The external income pushes their bracket, while external tax paid credits their computed tax."}
              </li>
              <li>
                <strong>{isAr ? "التأمين الطبي والخصومات الأخرى: " : "Medical & Other Deductions: "}</strong>
                {isAr ? "تطبيق خصومات شهرية ثابتة من صافي راتب الموظف." : "Apply fixed, recurring deductions from the employee's net salary."}
              </li>
              <li>
                <strong>{isAr ? "حد تأميني مخصص: " : "Specific Insurance Ceiling: "}</strong>
                {isAr ? "تحديد حد تأميني مخصص لموظف معين (يتجاوز الحد العام)." : "Set a custom insurance cap for a single employee (overrides global)."}
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3 pb-8">
            <h3 className="font-semibold text-base text-primary">
              {isAr ? "4. إدارة أكسيل الجماعية" : "4. Bulk Excel Workflow"}
            </h3>
            <p>
              {isAr ? "استخدم أزرار " : "Use the "}<strong>{isAr ? "تصدير" : "Export"}</strong>{isAr ? " و " : " and "}<strong>{isAr ? "استيراد" : "Import"}</strong>{isAr ? " في شاشة الرواتب لتحديث الحسابات البنكية والأرقام التأمينية لمئات الموظفين في وقت واحد." : " buttons on the Payroll screen to quickly manage bank accounts, insurance numbers, and advanced settings for hundreds of employees simultaneously."}
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
