import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  // Brand & Header
  'brand.title': { en: 'AttendanceTracker', ar: 'متتبع الحضور' },
  'brand.subtitle': { en: 'Wadi Degla Clubs Attendance & Overtime System', ar: 'نظام الحضور والعمل الإضافي لأندية وادي دجلة' },
  'brand.made_by': { en: 'Made by David Kalad', ar: 'صُنع بواسطة ديفيد كلاد' },
  'brand.cutoff_title': { en: 'Monthly Payroll Cycle (16th – 15th):', ar: 'دورة الرواتب الشهرية (16 إلى 15):' },
  'brand.cutoff_desc': { en: 'All overtime submissions must be filed with mandatory reasons before the 14th cutoff for Team Leader approval.', ar: 'يجب تقديم جميع طلبات العمل الإضافي مع الأسباب الإلزامية قبل موعد 14 للاعتماد من قائد الفريق.' },
  'brand.thu_early': { en: 'Thursday Early Departure: 4:00 PM', ar: 'الانصراف المبكر ليوم الخميس: 4:00 م' },
  'brand.tue_early': { en: 'Thursday Early Departure: 4:00 PM', ar: 'الانصراف المبكر ليوم الخميس: 4:00 م' },
  'header.switch_profile': { en: 'Switch Profile', ar: 'تبديل الملف الشخصي' },
  'header.manage': { en: '+ Manage', ar: '+ إدارة' },
  'header.reset': { en: 'Reset', ar: 'إعادة ضبط' },
  'header.reset_title': { en: 'Clear employee details and punch ledger to start a new employee entry', ar: 'مسح بيانات الموظف وسجل البصمات للبدء بموظف جديد' },

  // Roles
  'role.employee': { en: 'Employee', ar: 'موظف' },
  'role.team_leader': { en: 'Team Leader', ar: 'قائد الفريق' },
  'role.manager': { en: 'Manager', ar: 'مدير' },
  'role.admin': { en: 'Admin', ar: 'مسؤول النظام' },

  // Navigation & Tabs
  'app.my_timesheet': { en: '1. Timesheet', ar: '1. سجل الدوام' },
  'app.team_leader': { en: '2. Team Leader', ar: '2. قائد الفريق' },
  'app.approvals': { en: '2. Approvals', ar: '2. الموافقات' },
  'app.manager_matrix': { en: '3. Manager Matrix', ar: '3. مصفوفة المدير' },
  'app.matrix': { en: '3. Matrix', ar: '3. المصفوفة' },
  'app.database_hub': { en: 'Database Hub', ar: 'مركز قواعد البيانات' },
  
  // Ledger Sub-Tabs
  'ledger.data_entry': { en: '1. Data Entry', ar: '1. إدخال البيانات' },
  'ledger.timesheet': { en: '2. Timesheet', ar: '2. سجل الدوام' },
  'ledger.dashboard': { en: '3. Dashboard', ar: '3. لوحة القيادة' },

  // Portal Selector Banner
  'portal.selector_title': { en: 'PORTAL SELECTOR:', ar: 'محدد البوابات:' },
  'portal.tl_desc': { en: 'Jump to your Team Leader approval queue', ar: 'الانتقال إلى قائمة موافقات قائد الفريق' },
  'portal.mgr_desc': { en: 'Jump to Team Leader queue or Manager Matrix', ar: 'الانتقال إلى قائمة قائد الفريق أو مصفوفة المدير' },
  'portal.open_tl': { en: '👉 OPEN TAB 2: TEAM LEADER VIEW', ar: '👉 فتح التبويب 2: عرض قائد الفريق' },
  'portal.open_mgr': { en: '👉 OPEN TAB 3: MANAGER VIEW', ar: '👉 فتح التبويب 3: عرض المدير' },

  // Raw Input Card
  'raw.title': { en: 'Raw Attendance Punch Ledger', ar: 'سجل بصمات الحضور الخام' },
  'raw.load_sample': { en: 'Load Sample 1-Month Punches', ar: 'تحميل نموذج بصمات لشهر كامل' },
  'raw.paste': { en: 'Paste from Clipboard', ar: 'لصق من الحافظة' },
  'raw.pasted': { en: 'Pasted!', ar: 'تم اللصق!' },
  'raw.clear': { en: 'Clear', ar: 'مسح' },
  'raw.placeholder': { en: 'Paste your attendance punch logs here (Date, Check-in, Check-out)...', ar: 'الصق سجلات بصمة الحضور هنا (التاريخ، وقت الدخول، وقت الخروج)...' },
  'raw.read_ledger': { en: 'Read the ledger', ar: 'قراءة سجل الحضور' },
  'raw.processing': { en: 'Processing Ledger Data...', ar: 'جاري معالجة بيانات السجل...' },

  // Rules Card
  'rules.title': { en: 'Attendance & Overtime Rules Engine', ar: 'محرك قواعد الحضور والعمل الإضافي' },
  'rules.shift_end_std': { en: 'Regular Overtime Cutoff', ar: 'نقطة احتساب الإضافي للأيام العادية' },
  'rules.cutoff_time': { en: 'Overtime >:', ar: 'إضافي بعد >:' },
  'rules.shift_end_note': { en: 'Shift ends 5:00 PM • OT starts > 5:50 PM', ar: 'الوردية تنتهي 5:00 م • الإضافي يبدأ بعد 5:50 م' },
  'rules.thu_early_title': { en: 'Thursday 4 PM Shift', ar: 'وردية الخميس 4 مساءً' },
  'rules.thu_checkout': { en: 'Thu leave:', ar: 'انصراف الخميس:' },
  'rules.thu_ot_start': { en: 'Thu OT >:', ar: 'إضافي الخميس >:' },
  'rules.thu_early_note': { en: 'Shift ends 4:00 PM • OT starts > 4:50 PM', ar: 'الوردية تنتهي 4:00 م • الإضافي يبدأ بعد 4:50 م' },
  'rules.tue_early_title': { en: 'Thursday 4 PM Shift', ar: 'وردية الخميس 4 مساءً' },
  'rules.tue_checkout': { en: 'Thu leave:', ar: 'انصراف الخميس:' },
  'rules.worked_hours': { en: 'Worked Hours', ar: 'ساعات العمل' },
  'rules.ot_greater_than': { en: 'Overtime >', ar: 'إضافي بعد >' },
  'rules.hrs': { en: 'hrs', ar: 'ساعة' },
  'rules.late_arrival': { en: 'Late Arrival', ar: 'التأخير عن الحضور' },
  'rules.late_after': { en: 'Late after:', ar: 'التأخير بعد:' },
  'rules.weekend_title': { en: 'Official Weekend Days:', ar: 'أيام العطلة الأسبوعية الرسمية:' },

  // Export Card
  'export.card_title': { en: 'Export Overtime Log', ar: 'تصدير سجل العمل الإضافي' },
  'export.emp_db': { en: 'Employee DB', ar: 'دليل الموظفين' },
  'export.reset_profile': { en: 'Reset Profile', ar: 'إعادة تعيين الملف' },
  'export.sticky_notes': { en: 'Sticky Notes', ar: 'الملاحظات السريعة' },
  'export.params_title': { en: 'Employee & Shift Parameters', ar: 'بيانات الموظف ومحددات الوردية' },
  'export.approver': { en: 'Assigned Approver:', ar: 'المعتمد المسؤول:' },
  'export.sap_label': { en: 'SAP # (Numeric Only)', ar: 'رقم ساب SAP (أرقام فقط)' },
  'export.sap_valid': { en: '✓ Valid SAP', ar: '✓ رقم SAP صالح' },
  'export.sap_numbers_only': { en: '⚠️ Numbers Only', ar: '⚠️ أرقام فقط' },
  'export.name_label': { en: 'Full Employee Name', ar: 'اسم الموظف بالكامل' },
  'export.name_set': { en: '✓ Set', ar: '✓ تم التحديد' },
  'export.name_type': { en: '⚠️ Type Name', ar: '⚠️ اكتب الاسم' },
  'export.shift_end_label': { en: 'Shift End Time', ar: 'وقت نهاية الوردية' },
  'export.sap_placeholder': { en: 'SAP', ar: 'رقم SAP' },
  'export.name_placeholder': { en: 'Full Employee Name', ar: 'اسم الموظف بالكامل' },
  'export.err_sap': { en: 'Numeric SAP number is required (digits only).', ar: 'رقم ساب SAP الرقمي مطلوب (أرقام فقط).' },
  'export.err_name': { en: 'Full Employee Name is required to export or submit.', ar: 'اسم الموظف الكامل مطلوب للتصدير أو الإرسال.' },
  'export.err_absent': { en: 'Checkpoint Required: {count} absence day(s) need verification before Excel export.', ar: 'يلزم التحقق: {count} يوم غياب يحتاج مراجعة قبل التصدير.' },
  'export.err_reasons': { en: 'Overtime Reason Required: {count} day(s) missing justification.', ar: 'سبب العمل الإضافي مطلوب: {count} يوم ينقصه التبرير.' },
  'export.all_verified': { en: 'SAP #{sap}, {name} & {count} overtime reasons verified.', ar: 'تم التحقق من ساب #{sap}، {name} و {count} سبب عمل إضافي.' },
  'export.no_ot': { en: 'No overtime days detected in the current ledger.', ar: 'لم يتم العثور على أيام عمل إضافي في السجل الحالي.' },
  'export.fill_sticky': { en: 'Fill with Sticky Notes', ar: 'التعبئة من الملاحظات السريعة' },
  'export.submit_btn': { en: 'Submit to TL:', ar: 'إرسال لقائد الفريق:' },
  'export.export_btn': { en: 'Export Excel Ledger', ar: 'تصدير سجل إكسيل' },
  'export.lock_sap': { en: 'Numeric SAP # Required', ar: 'مطلوب رقم SAP رقمي' },
  'export.lock_name': { en: 'Name Required to Submit', ar: 'مطلوب الاسم للإرسال' },
  'export.lock_name_excel': { en: 'Name Required for Excel', ar: 'مطلوب الاسم لتصدير الإكسيل' },
  'export.complete_missing': { en: 'Complete Missing Items', ar: 'أكمل البنود الناقصة' },
  'export.readiness_title': { en: 'Mandatory Export Verification', ar: 'التحقق الإلزامي لتصدير البيانات' },
  'export.progress_label': { en: 'Export Readiness Progress', ar: 'مؤشر جاهزية التصدير' },
  'export.ready_100': { en: '100% Ready — All Requirements Satisfied', ar: '100% جاهز — تم استيفاء جميع المتطلبات' },
  'export.missing_banner': { en: '{count} Mandatory Item(s) Pending before Export:', ar: 'يوجد {count} بند إلزامي معلق قبل التصدير:' },
  'export.sec1_identity': { en: '1. Employee Identity', ar: '1. بيانات هوية الموظف' },
  'export.sec2_punches': { en: '2. Attendance Punches', ar: '2. بصمات الحضور' },
  'export.sec3_ot': { en: '3. Overtime Reasons', ar: '3. أسباب العمل الإضافي' },
  'export.sec4_absent': { en: '4. Absence Checkpoints', ar: '4. مراجعة أيام الغياب' },

  // Section Segmentation & Stepper
  'section.sec1_tab': { en: 'Section 1: Data Entry & Setup', ar: 'القسم 1: إدخال البيانات والإعدادات' },
  'section.sec1_desc': { en: 'Export Overtime Log, Rules Engine & Raw Biometric Punches', ar: 'سجل التصدير، محرك القواعد وبصمات الحضور الخام' },
  'section.sec2_tab': { en: 'Section 2: Processed RAW Data', ar: 'القسم 2: البيانات المعالجة من السجل' },
  'section.sec2_desc': { en: 'Summary Metrics, Late Arrival Alerts & Timesheet Ledger Table', ar: 'المؤشرات الإحصائية، تنبيهات التأخير وجدول الحضور اليومي' },
  'section.sec3_tab': { en: 'Section 3: Verification & Export', ar: 'القسم 3: التحقق والتصدير' },
  'section.sec3_desc': { en: '0-100% Readiness Bar, Missing Items Navigator & Excel Exporter', ar: 'مؤشر الجاهزية 0-100%، توجيه البنود الناقصة وتصدير الإكسيل' },
  'section.missing_click_hint': { en: 'Click any missing item below to jump directly to its section and fix it', ar: 'اضغط على أي بند ناقص أدناه للانتقال مباشرة إلى القسم الخاص به وتعديله' },
  'section.next_sec2': { en: 'Continue to Section 2: Processed Ledger →', ar: 'المتابعة إلى القسم 2: السجل المعالج ←' },
  'section.next_sec3': { en: 'Continue to Section 3: Verification & Export →', ar: 'المتابعة إلى القسم 3: التحقق والتصدير ←' },
  'section.back_sec1': { en: '← Back to Section 1: Data Entry & Setup', ar: '← العودة للقسم 1: إدخال البيانات' },
  'section.back_sec2': { en: '← Back to Section 2: Processed Ledger', ar: '← العودة للقسم 2: السجل المعالج' },

  // Employee Report Hero
  'hero.verified_100': { en: '100% Data Verified & Complete', ar: '100% البيانات مدققة ومكتملة' },
  'hero.incomplete': { en: '{pct}% Data In — Incomplete Items', ar: '{pct}% البيانات مكتملة — توجد بنود ناقصة' },
  'hero.shift_end': { en: 'Shift End:', ar: 'نهاية الوردية:' },
  'hero.select_dir': { en: 'Select from Directory', ar: 'اختر من الدليل' },
  'hero.staff_id': { en: 'Staff ID #', ar: 'رقم الموظف #' },
  'hero.ready': { en: 'Ready', ar: 'جاهز' },
  'hero.filled': { en: 'Filled', ar: 'مكتمل' },
  'hero.days_in_ledger': { en: 'Days in Ledger', ar: 'أيام في السجل' },
  'hero.on_time': { en: 'On-Time', ar: 'في الموعد' },
  'hero.audit_status': { en: 'Data Verification Status', ar: 'حالة التحقق من البيانات' },
  'hero.tile_emp': { en: 'Employee & Approver', ar: 'الموظف والمعتمد' },
  'hero.tile_ot_reasons': { en: 'Overtime Reasons', ar: 'أسباب العمل الإضافي' },
  'hero.tile_punctuality': { en: 'Punctuality Status', ar: 'مستوى الالتزام بالموعد' },
  'hero.tile_export': { en: 'Export Readiness', ar: 'جاهزية التصدير' },
  'hero.all_reasons_doc': { en: 'All reasons documented', ar: 'جميع الأسباب موثقة' },
  'hero.reasons_req': { en: 'Reasons required', ar: 'الأسباب مطلوبة' },
  'hero.zero_late': { en: '0 Late', ar: '0 تأخير' },
  'hero.checkins_before': { en: 'Check-ins before', ar: 'حضور قبل' },
  'hero.late_arrivals_count': { en: 'late arrival(s)', ar: 'مرات تأخير' },
  'hero.ready_for_excel': { en: 'Ready for Excel export', ar: 'جاهز لتصدير إكسيل' },
  'hero.required_missing': { en: 'Required items missing ({done}/{total} completed):', ar: 'عناصر مطلوبة مفقودة (تم إكمال {done} من {total}):' },
  'hero.punctuality': { en: 'Punctuality', ar: 'الالتزام بالموعد' },
  'hero.overtime': { en: 'Overtime', ar: 'العمل الإضافي' },
  'hero.on_time_days': { en: 'On Time', ar: 'حضور في الموعد' },
  'hero.ot_days': { en: 'Overtime Days', ar: 'أيام العمل الإضافي' },
  'hero.excused': { en: 'Excused', ar: 'إذن رسمي / مبرر' },
  'hero.late_days': { en: 'Late Days', ar: 'أيام التأخير' },

  // Summary Card
  'summary.title': { en: 'Ledger Overview', ar: 'نظرة عامة على السجل' },
  'summary.breakdown_title': { en: 'Attendance Breakdown —', ar: 'تفصيل الحضور —' },
  'summary.days_processed': { en: 'Days Processed', ar: 'يوماً تمت معالجتها' },
  'summary.weekend_config': { en: 'Official Weekend & Rest Days Configuration', ar: 'إعدادات العطلات الأسبوعية وأيام الراحة الرسمية' },
  'summary.active_weekend': { en: 'Active Weekend:', ar: 'العطلة الحالية:' },
  'summary.presets': { en: 'Presets:', ar: 'نماذج جاهزة:' },
  'summary.fri_sat': { en: 'Fri & Sat', ar: 'الجمعة والسبت' },
  'summary.sat_sun': { en: 'Sat & Sun', ar: 'السبت والأحد' },
  'summary.fri_sat_sun': { en: 'Fri, Sat & Sun', ar: 'الجمعة والسبت والأحد' },
  'summary.on_time': { en: 'On time', ar: 'في الموعد' },
  'summary.ot_days': { en: 'Overtime days', ar: 'أيام الإضافي' },
  'summary.excused_days': { en: 'Excused days', ar: 'أيام بإذن' },
  'summary.unexcused_off': { en: 'Unexcused off', ar: 'غياب غير مبرر' },
  'summary.total_ot': { en: 'Total overtime', ar: 'إجمالي الإضافي' },
  'summary.late_arrivals': { en: 'Late arrivals', ar: 'مرات التأخير' },
  'summary.wfh': { en: 'Work From Home (WFH)', ar: 'عمل من المنزل' },
  'summary.with_excuse': { en: 'with excuse (counted on-time)', ar: 'بإذن رسمي (محسوب حضور)' },
  'summary.manual_ot': { en: 'manual overtime', ar: 'إضافي يدوي' },
  'summary.unexcused': { en: 'unexcused', ar: 'غير مبرر' },
  'summary.weekend_rest': { en: 'weekend / rest days', ar: 'عطلات أسبوعية / راحة' },
  'summary.holiday': { en: 'holiday', ar: 'عطلة رسمية' },
  'summary.leave': { en: 'leave', ar: 'إجازة' },

  // Day Table
  'table.title': { en: 'Day-by-Day Ledger Table & Reason Manager', ar: 'جدول الحضور اليومي وإدارة الأسباب' },
  'table.no_data': { en: 'No Attendance Data Loaded', ar: 'لم يتم تحميل بيانات حضور' },
  'table.no_data_desc': { en: 'Paste attendance punch logs into the input area above and click "Read the ledger" to calculate worked hours, overtime, and attendance status.', ar: 'الصق سجلات البصمة في خانة الإدخال أعلاه واضغط "قراءة سجل الحضور" لحساب ساعات العمل والإضافي وحالة الحضور.' },
  'table.col_date': { en: 'Date', ar: 'التاريخ' },
  'table.col_day': { en: 'Day', ar: 'اليوم' },
  'table.col_in_out': { en: 'In / Out', ar: 'دخول / خروج' },
  'table.col_shape': { en: 'Day shape', ar: 'مخطط اليوم' },
  'table.col_worked': { en: 'Worked', ar: 'ساعات العمل' },
  'table.col_status': { en: 'Status & Alerts', ar: 'الحالة والتنبيهات' },
  'table.col_reason': { en: 'Reason / Excuse Checkpoint', ar: 'سبب الإضافي / فحص الغياب' },
  'table.col_category': { en: 'Category', ar: 'التصنيف' },
  'table.reason_placeholder': { en: 'Enter justification reason...', ar: 'اكتب سبب العمل الإضافي...' },
  'table.excuse_placeholder': { en: 'Enter absence excuse...', ar: 'اكتب مبرر الغياب...' },
  'table.mark_excused': { en: 'Mark as Leave / Excused', ar: 'تحديد كإجازة / بإذن' },
  'table.permission_filed': { en: 'Permission Filed', ar: 'تم تقديم إذن' },
  'table.late_badge': { en: 'Late', ar: 'تأخير' },
  'table.ot_badge': { en: 'Overtime', ar: 'عمل إضافي' },

  // Categories
  'cat.present': { en: 'Present (On-time)', ar: 'حضور (في الموعد)' },
  'cat.overtime_manual': { en: 'Overtime (Manual)', ar: 'عمل إضافي (يدوي)' },
  'cat.excused': { en: 'Excused / Permission', ar: 'بإذن رسمي / معذور' },
  'cat.wfh': { en: 'Work From Home (WFH)', ar: 'عمل من المنزل' },
  'cat.absent': { en: 'Absent (Unexcused)', ar: 'غياب (بدون إذن)' },
  'cat.leave': { en: 'Approved Leave', ar: 'إجازة معتمدة' },
  'cat.weekend': { en: 'Official Weekend', ar: 'عطلة أسبوعية رسمية' },
  'cat.holiday': { en: 'Official Holiday', ar: 'عطلة رسمية' },

  // Late Alert Banner
  'late.title': { en: 'Late Arrival Warning Alert', ar: 'تنبيه التأخر عن موعد الحضور' },
  'late.desc': { en: 'You arrived after the {threshold} threshold. Submit a permission request for each day to avoid unexcused late status.', ar: 'لقد سجلت الحضور بعد موعد {threshold}. يرجى تقديم طلب إذن لكل يوم لتجنب احتساب التأخير غير المبرر.' },
  'late.in_at': { en: 'In at {time} ({mins} late)', ar: 'دخول في {time} (تأخير {mins})' },
  'late.status_filed': { en: 'Permission status marked as filed.', ar: 'تم تسجيل حالة الإذن كـ "تم التقديم".' },
  'late.reminder': { en: '⚠️ Reminder: Make a permission for this day!', ar: '⚠️ تذكير: يرجى عمل إذن لهذا اليوم!' },
  'late.copy_template': { en: 'Copy Template', ar: 'نسخ النموذج' },
  'late.copied': { en: 'Copied Template!', ar: 'تم النسخ!' },
  'late.mark_filed': { en: 'Mark Permission Filed', ar: 'تسجيل تقديم الإذن' },
  'late.filed': { en: 'Filed', ar: 'تم التقديم' },

  // Submission Status Card
  'sub.draft_title': { en: 'Timesheet Submission Status', ar: 'حالة تقديم سجل الدوام' },
  'sub.draft_badge': { en: 'Draft (Not Submitted)', ar: 'مسودة (لم تُرسل بعد)' },
  'sub.draft_desc_ot': { en: 'You have {count} overtime day(s) ready to submit to your assigned Team Leader: {leader} ({team}).', ar: 'لديك {count} يوم عمل إضافي جاهز للإرسال إلى قائد الفريق المعتمد: {leader} ({team}).' },
  'sub.draft_desc_none': { en: 'Punches loaded in draft mode. Submit to your assigned Team Leader ({leader}) for approval.', ar: 'تم تحميل البصمات كمسودة. أرسلها إلى قائد الفريق ({leader}) للاعتماد.' },
  'sub.title': { en: 'Timesheet Submission Status', ar: 'حالة تقديم سجل الدوام' },
  'sub.draft': { en: 'Draft (Not Submitted)', ar: 'مسودة (لم تُرسل بعد)' },
  'sub.req_title': { en: 'Official Submission Request', ar: 'طلب التقديم الرسمي' },
  'sub.waiting_approval': { en: 'WAITING FOR APPROVAL:', ar: 'بانتظار موافقة:' },
  'sub.approved_by': { en: 'APPROVED BY', ar: 'تم الاعتماد بواسطة' },
  'sub.rejected_by': { en: 'CHANGES REQUESTED BY', ar: 'مطلوب تعديلات بواسطة' },
  'sub.routed_msg': { en: 'Your overtime request for {name} has been routed to your Team Leader: {leader} ({team}).', ar: 'تم توجيه طلب العمل الإضافي لـ {name} إلى قائد الفريق: {leader} ({team}).' },
  'sub.approved_msg': { en: 'Overtime claim approved by {leader} for payroll processing ({time})', ar: 'تم اعتماد طلب العمل الإضافي من {leader} لإدراجه بالراتب ({time})' },
  'sub.feedback_from': { en: 'Feedback from {leader}', ar: 'ملاحظات {leader}' },
  'sub.feedback_fallback': { en: 'Please adjust hours or justifications', ar: 'يرجى مراجعة الساعات أو المبررات' },
  'sub.period': { en: 'Period:', ar: 'الفترة:' },
  'sub.team': { en: 'Team:', ar: 'الفريق:' },
  'sub.total_ot': { en: 'Total Overtime:', ar: 'إجمالي الإضافي:' },
  'sub.submitted': { en: 'Submitted:', ar: 'تاريخ الإرسال:' },
  'sub.reviewed_by': { en: 'Reviewed by:', ar: 'تمت المراجعة بواسطة:' },
  'sub.update_resubmit': { en: 'Update / Resubmit Request', ar: 'تحديث / إعادة إرسال الطلب' },
  'sub.submit_to': { en: 'Submit to', ar: 'إرسال إلى' },
  'sub.open_tab2': { en: '👉 Open in Tab 2 (Team Leader View)', ar: '👉 فتح في التبويب 2 (عرض قائد الفريق)' },

  // Team Leader Approvals
  'tl.view_active': { en: 'Active View: Team Leader Approvals (Tab 2)', ar: 'العرض الحالي: موافقات قائد الفريق (التبويب 2)' },
  'tl.return_tab1': { en: '👈 Return to Tab 1: My Timesheet', ar: '👈 العودة للتبويب 1: سجل الدوام' },
  'tl.goto_tab3': { en: '👉 Go to Tab 3: Manager Matrix', ar: '👉 الانتقال للتبويب 3: مصفوفة المدير' },
  'tl.portal_title': { en: 'Team Leader Review Portal', ar: 'بوابة مراجعة قائد الفريق' },
  'tl.reviewer': { en: 'Reviewer:', ar: 'المراجع:' },
  'tl.center_title': { en: 'Overtime Approval & Duration Verification Center', ar: 'مركز اعتماد العمل الإضافي والتحقق من الساعات' },
  'tl.pending': { en: 'Pending', ar: 'قيد الانتظار' },
  'tl.submissions': { en: 'Submissions', ar: 'طلبات' },
  'tl.approved': { en: 'Approved', ar: 'معتمد' },
  'tl.pending_hours': { en: 'Pending Hours', ar: 'الساعات المعلقة' },
  'tl.team_scope': { en: 'Team Scope:', ar: 'نطاق الفريق:' },
  'tl.team_scope_desc': { en: 'Viewing submissions exclusively from {team} (Members: {count}).', ar: 'عرض الطلبات الخاصة حصرياً بفريق {team} (الأعضاء: {count}).' },
  'tl.emp_scope_desc': { en: 'Viewing submissions belonging to your employee profile in {team}.', ar: 'عرض الطلبات الخاصة بملفك الشخصي فقط في {team}.' },
  'tl.mgr_scope_desc': { en: 'Full clearance across all teams and departments.', ar: 'صلاحية كاملة لجميع الفرق والأقسام.' },
  'tl.access_enforced': { en: 'Team Access Enforced', ar: 'الوصول محدد بالفريق' },
  'tl.status_label': { en: 'Status:', ar: 'الحالة:' },
  'tl.status_all': { en: 'all', ar: 'الكل' },
  'tl.status_pending': { en: 'pending', ar: 'معلق' },
  'tl.status_approved': { en: 'approved', ar: 'معتمد' },
  'tl.status_rejected': { en: 'rejected', ar: 'مرفوض' },
  'tl.team_label': { en: 'Team:', ar: 'الفريق:' },
  'tl.all_teams': { en: 'All Teams', ar: 'جميع الفرق' },
  'tl.showing_count': { en: 'Showing {filtered} of {total} accessible submissions', ar: 'عرض {filtered} من إجمالي {total} طلب متاح' },
  'tl.no_subs_found': { en: 'No overtime submissions found', ar: 'لم يتم العثور على طلبات عمل إضافي' },
  'tl.no_subs_desc': { en: 'When team members submit overtime from their timesheet, their records within your team will appear here for review and hour adjustment.', ar: 'عندما يقوم أعضاء الفريق بإرسال طلبات العمل الإضافي من سجلاتهم، ستظهر هنا للمراجعة والاعتماد.' },
  'tl.no_subs_filtered': { en: 'No submissions matching status "{status}" in your assigned team.', ar: 'لا توجد طلبات تطابق حالة "{status}" في فريقك.' },
  'tl.hours_adjusted_badge': { en: 'Hours Adjusted by TL', ar: 'تم تعديل الساعات بواسطة قائد الفريق' },
  'tl.claimed_ot': { en: 'Claimed OT', ar: 'الإضافي المطلوب' },
  'tl.authorized_ot': { en: 'Authorized OT', ar: 'الإضافي المعتمد' },
  'tl.batch_review_title': { en: 'Overtime Days Review ({count} days claimed)', ar: 'مراجعة أيام العمل الإضافي ({count} يوم مطلوب)' },
  'tl.approve_all_days': { en: 'Approve All Days', ar: 'اعتماد جميع الأيام' },
  'tl.reject_all_days': { en: 'Reject All', ar: 'رفض الكل' },
  'tl.export_approved_excel': { en: 'Export Approved Excel', ar: 'تصدير المعتمد لإكسيل' },
  'tl.clear_sub': { en: 'Clear Submission', ar: 'مسح الطلب' },
  'tl.col_date_day': { en: 'Date & Day', ar: 'التاريخ واليوم' },
  'tl.col_punch_shift': { en: 'Punch Shift', ar: 'أوقات البصمة' },
  'tl.col_claimed_ot': { en: 'Claimed OT', ar: 'المطلوب' },
  'tl.col_authorized_ot': { en: 'TL Authorized OT', ar: 'المعتمد من القائد' },
  'tl.col_justification': { en: 'Employee Justification', ar: 'مبرر الموظف' },
  'tl.col_status_actions': { en: 'Status / Actions', ar: 'الحالة / الإجراءات' },
  'tl.edit_ot_title': { en: 'Edit Overtime Duration', ar: 'تعديل مدة العمل الإضافي' },
  'tl.hours_label': { en: 'Hours', ar: 'ساعات' },
  'tl.mins_label': { en: 'Mins', ar: 'دقائق' },
  'tl.adjust_notes': { en: 'Adjustment Justification / Notes', ar: 'سبب التعديل / ملاحظات' },
  'tl.save_approve': { en: 'Save & Approve', ar: 'حفظ واعتماد' },
  'tl.save_only': { en: 'Save Only', ar: 'حفظ فقط' },
  'tl.cancel': { en: 'Cancel', ar: 'إلغاء' },
  'tl.edit_ot_btn': { en: 'Edit OT', ar: 'تعديل' },
  'tl.zero_btn': { en: 'Zero (0h)', ar: 'تصفير (0 س)' },
  'tl.reset_btn': { en: 'Reset', ar: 'استعادة' },
  'tl.decision_note_placeholder': { en: 'Decision note / reason (optional)...', ar: 'ملاحظة أو سبب القرار (اختياري)...' },
  'tl.quick_verified': { en: '+ Verified', ar: '+ معتمد' },
  'tl.quick_deny_shift': { en: '+ Deny: Shift done', ar: '+ رفض: أنجز بالوردية' },
  'tl.quick_deny_unapproved': { en: '+ Deny: Unapproved', ar: '+ رفض: غير مصرح' },
  'tl.approve_btn': { en: 'Approve', ar: 'اعتماد' },
  'tl.reject_btn': { en: 'Reject', ar: 'رفض' },
  'tl.edit_note': { en: 'Edit note', ar: 'تعديل الملاحظة' },

  // Manager Matrix & Overview
  'mgr.view_active': { en: 'Active View: Executive Manager Overview (Tab 3)', ar: 'العرض الحالي: نظرة عامة للإدارة التنفيذية (التبويب 3)' },
  'mgr.title': { en: 'Executive Manager Matrix & Payroll Overview', ar: 'مصفوفة الإدارة التنفيذية ونظرة عامة على الرواتب' },
  'mgr.subtitle': { en: 'High-level department summaries, team comparisons, and master payroll export.', ar: 'ملخصات الأقسام، مقارنات الفرق، وتصدير ملف الرواتب المجمع.' },
  'mgr.master_export': { en: 'Export Master Company Excel', ar: 'تصدير سجل إكسيل المجمع للشركة' },
  'mgr.dept_filter': { en: 'Department:', ar: 'القسم:' },
  'mgr.team_filter': { en: 'Team:', ar: 'الفريق:' },
  'mgr.all_depts': { en: 'All Departments', ar: 'جميع الأقسام' },
  'mgr.all_teams': { en: 'All Teams', ar: 'جميع الفرق' },
  'mgr.col_emp': { en: 'Employee & SAP', ar: 'الموظف ورقم SAP' },
  'mgr.col_team': { en: 'Team & Leader', ar: 'الفريق والقائد' },
  'mgr.col_claimed': { en: 'Claimed OT', ar: 'المطلوب' },
  'mgr.col_authorized': { en: 'Authorized OT', ar: 'المعتمد' },
  'mgr.col_status': { en: 'Overall Status', ar: 'الحالة العامة' },
  'mgr.col_action': { en: 'Actions', ar: 'إجراءات' },
  'mgr.total_employees': { en: 'Total Employees', ar: 'إجمالي الموظفين' },
  'mgr.total_teams': { en: 'Active Teams', ar: 'الفرق النشطة' },
  'mgr.approved_ot_total': { en: 'Total Approved Overtime', ar: 'إجمالي الإضافي المعتمد' },
  'mgr.pending_ot_total': { en: 'Total Pending Claims', ar: 'إجمالي الطلبات المعلقة' },

  // Validation Warnings & Alerts
  'val.missing_identity': { en: '⛔ Missing Identity: Please enter your SAP ID and Name in the Data Entry tab before accessing other sections.', ar: '⛔ بيانات الهوية مفقودة: يرجى إدخال رقم SAP واسم الموظف في تبويب إدخال البيانات قبل الانتقال لأي تبويب آخر.' },
  'val.missing_identity_subtab': { en: '⛔ Missing Identity: Please enter your SAP ID and Name in the Data Entry tab.', ar: '⛔ بيانات الهوية مفقودة: يرجى إدخال رقم SAP واسم الموظف في تبويب إدخال البيانات.' },
  'val.missing_data_logs': { en: '⛔ Missing Data: Please paste your raw attendance logs first.', ar: '⛔ البيانات مفقودة: يرجى لصق سجل بصمات الحضور أولاً.' },
  'val.invalid_sap_numeric': { en: '⛔ Invalid SAP ID: SAP must contain numbers only.', ar: '⛔ رقم SAP غير صحيح: يجب أن يحتوي على أرقام فقط.' },
  'val.invalid_name': { en: '⛔ Invalid Name: Please enter a valid employee name.', ar: '⛔ اسم الموظف غير صحيح: يرجى إدخال اسم حقيقي.' },
  'val.cannot_export_sap': { en: '⛔ CANNOT EXPORT EXCEL: SAP / Employee ID is strictly mandatory. Please fill in your valid SAP ID first.', ar: '⛔ لا يمكن تصدير الإكسيل: رقم SAP إلزامي. يرجى إدخال رقم ساب صحيح أولاً.' },
  'val.cannot_export_name': { en: '⛔ CANNOT EXPORT EXCEL: Full Employee Name is strictly mandatory. Please fill in your real name first.', ar: '⛔ لا يمكن تصدير الإكسيل: اسم الموظف إلزامي. يرجى كتابة الاسم أولاً.' },
  'val.no_ot_export': { en: 'No overtime days found in the current timesheet to export.', ar: 'لا توجد أيام عمل إضافي في سجل الدوام الحالي لتصديرها.' },
  'val.missing_reasons_export': { en: '⚠️ CANNOT EXPORT EXCEL: Mandatory Reason Missing: Please complete all overtime reasons first.', ar: '⚠️ لا يمكن تصدير الإكسيل: أسباب إلزامية مفقودة: يرجى استكمال جميع أسباب العمل الإضافي أولاً.' },
  'val.missing_absent_export': { en: '⚠️ Cannot export Excel: Unexcused absence days require a checkpoint or excuse to be checked first.', ar: '⚠️ لا يمكن تصدير الإكسيل: توجد أيام غياب تتطلب تحديد مبرر أو إجازة أولاً.' },

  // Sticky Notes Modal
  'sticky.title': { en: 'Quick Overtime Justifications (Sticky Notes)', ar: 'الملاحظات السريعة لأسباب العمل الإضافي' },
  'sticky.subtitle': { en: 'Quickly apply standard pre-written justification reasons across multiple overtime dates.', ar: 'تطبيق أسباب تبرير جاهزة وموحدة بسرعة على تواريخ العمل الإضافي.' },
  'sticky.apply_all': { en: 'Apply Reason to All Overtime Days', ar: 'تطبيق السبب على جميع أيام الإضافي' },
  'sticky.save_close': { en: 'Save & Close', ar: 'حفظ وإغلاق' },
  'sticky.quick_templates': { en: 'Pre-Approved Standard Justifications:', ar: 'مبررات معتمدة جاهزة:' },

  // Employee Directory Modal
  'dir.title': { en: 'Employee & Staff Directory', ar: 'دليل الموظفين وفرق العمل' },
  'dir.subtitle': { en: 'Select an employee to auto-fill SAP ID, Full Name, and Assigned Team.', ar: 'اختر موظفاً لتعبئة رقم SAP، الاسم بالكامل، والفريق التابع له تلقائياً.' },
  'dir.search': { en: 'Search staff by name or SAP ID...', ar: 'بحث في الموظفين بالاسم أو رقم SAP...' },
  'dir.select': { en: 'Select', ar: 'اختيار' },
  'dir.close': { en: 'Close', ar: 'إغلاق' },
  'dir.add_new': { en: 'Add Employee to Database', ar: 'إضافة موظف لقاعدة البيانات' },
  'dir.emp_name': { en: 'Employee Name', ar: 'اسم الموظف' },
  'dir.sap_id': { en: 'SAP ID', ar: 'رقم SAP' },
  'dir.team': { en: 'Team', ar: 'الفريق' },
  'dir.actions': { en: 'Actions', ar: 'إجراءات' },
  'dir.save': { en: 'Save Employee', ar: 'حفظ الموظف' },

  // Database Modal
  'db.title': { en: 'Database Center & Organization Hierarchy', ar: 'مركز قواعد البيانات والهيكل التنظيمي' },
  'db.subtitle': { en: 'Manage teams, assign leaders, and organize employee hierarchy.', ar: 'إدارة الفرق، تعيين القادة، وتنظيم الهيكل الإداري للموظفين.' },
  'db.tab_teams': { en: 'Teams & Leaders', ar: 'الفرق والقادة' },
  'db.tab_members': { en: 'Team Members Assignment', ar: 'توزيع أعضاء الفرق' },
  'db.tab_raw': { en: 'Raw Database JSON', ar: 'بيانات JSON المباشرة' },
  'db.add_team': { en: 'Create New Team', ar: 'إنشاء فريق جديد' },
  'db.team_name': { en: 'Team Name', ar: 'اسم الفريق' },
  'db.leader_name': { en: 'Leader Name', ar: 'اسم قائد الفريق' },
  'db.leader_sap': { en: 'Leader SAP ID', ar: 'رقم SAP لقائد الفريق' },
  'db.save_team': { en: 'Save Team', ar: 'حفظ الفريق' },
  'db.reset_default': { en: 'Reset to Default Hierarchy', ar: 'استعادة الهيكل الافتراضي' },
  'db.close': { en: 'Close', ar: 'إغلاق' },

  // Duplicate Warning Modal
  'dup.title': { en: 'Existing Submission Detected', ar: 'تم العثور على طلب سابق' },
  'dup.desc': { en: 'You have already submitted an overtime timesheet for this cycle. Submitting again will update and replace the existing queue item.', ar: 'لقد قمت بتقديم طلب عمل إضافي مسبقاً لهذه الدورة. الإرسال مجدداً سيقوم بتحديث واستبدال الطلب الحالي لدى قائد الفريق.' },
  'dup.confirm': { en: 'Overwrite & Update Submission', ar: 'تأكيد التحديث واستبدال الطلب' },
  'dup.cancel': { en: 'Keep Existing / Cancel', ar: 'الإبقاء على الطلب الحالي / إلغاء' },

  // Settings
  'theme.dark': { en: 'Dark Mode', ar: 'الوضع الداكن' },
  'theme.light': { en: 'Light Mode', ar: 'الوضع المضيء' },
  'lang.english': { en: 'English', ar: 'الإنجليزية' },
  'lang.arabic': { en: 'العربية', ar: 'العربية' },
  'footer.text': { en: 'Wadi Degla Clubs Attendance & Overtime System', ar: 'نظام الحضور والعمل الإضافي لأندية وادي دجلة' },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key, defaultText) => defaultText || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    localStorage.removeItem('app_language');
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  }, []);

  const t = (key: string, defaultText?: string): string => {
    const translation = translations[key]?.[language];
    if (translation) return translation;
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
