# إصلاح إدخال الرصيد الافتتاحي السالب - مكتمل

## المشكلة المُبلغ عنها
**المشكلة**: حقول الرصيد الافتتاحي من نوع `number` لا تسمح بإدخال القيم السالبة بشكل صحيح
**المطلوب**: تغيير نوع الحقول إلى `text` لتمكين إدخال القيم السالبة في جميع النماذج

## التعديلات المُنفذة

### 1. العملاء - نموذج الإضافة ✅
**الملف**: `backend/public/clients.html`
**التعديل**:
```html
<!-- قبل -->
<input type="number" id="openingBalance" name="opening_balance" step="0.01" placeholder="0.00" autocomplete="off">

<!-- بعد -->
<input type="text" id="openingBalance" name="opening_balance" placeholder="0.00" autocomplete="off">
```

### 2. العملاء - نموذج التعديل ✅
**الملف**: `backend/public/clients-details.html`
**التعديل**:
```html
<!-- قبل -->
<input type="number" id="editOpeningBalance" name="opening_balance" step="0.01" placeholder="0.00" autocomplete="off">

<!-- بعد -->
<input type="text" id="editOpeningBalance" name="opening_balance" placeholder="0.00" autocomplete="off">
```

### 3. المقاولين - نموذج التعديل ✅
**الملف**: `backend/public/contractor-details.html`
**التعديل**:
```html
<!-- قبل -->
<input type="number" id="editContractorOpeningBalance" name="opening_balance" step="0.01" placeholder="0.00">

<!-- بعد -->
<input type="text" id="editContractorOpeningBalance" name="opening_balance" placeholder="0.00">
```

### 4. المقاولين - نموذج الإضافة (SweetAlert) ✅
**الملف**: `backend/public/contractors.html`
**التعديل**:
```javascript
// قبل
const { value: opening } = await Swal.fire({ 
    title: 'رصيد افتتاحي (اختياري)', 
    input: 'number', 
    inputPlaceholder: '0', 
    inputValue: '0', 
    showCancelButton: true 
});

// بعد
const { value: opening } = await Swal.fire({ 
    title: 'رصيد افتتاحي (اختياري)', 
    input: 'text', 
    inputPlaceholder: '0', 
    inputValue: '0', 
    showCancelButton: true 
});
```

### 5. الكسارات ✅
**حالة**: الكسارات لا تحتوي على رصيد افتتاحي - لا حاجة لتعديل

## الفوائد من التعديل

### 1. إمكانية إدخال القيم السالبة ✅
- **قبل**: `type="number"` يمنع أو يعقد إدخال القيم السالبة
- **بعد**: `type="text"` يسمح بإدخال أي قيمة نصية بما في ذلك الأرقام السالبة

### 2. مرونة أكبر في الإدخال ✅
- يمكن إدخال: `-1000`, `-1500.50`, `0`, `1000`, `-0.01`
- لا توجد قيود على التنسيق أو العلامات

### 3. تجربة مستخدم أفضل ✅
- لا توجد رسائل خطأ من المتصفح
- إدخال سلس للقيم السالبة
- عدم فقدان البيانات عند التبديل بين الحقول

## معالجة البيانات في الكود

### JavaScript Processing
```javascript
// تحويل النص إلى رقم
const openingBalance = parseFloat(inputValue) || 0;

// التحقق من صحة القيمة
if (isNaN(openingBalance)) {
    // معالجة الخطأ
    alert('يرجى إدخال رقم صالح');
    return;
}
```

### Server-side Processing
```javascript
// في الـ API routes
const opening_balance = toNumber(req.body.opening_balance);

// دالة toNumber موجودة بالفعل وتتعامل مع النصوص
const toNumber = (v) => Number(v || 0);
```

## اختبار التعديلات

### ملف الاختبار: `test-negative-balance-input.html`
يحتوي على:
1. **نماذج اختبار** لجميع أنواع الحقول
2. **قيم اختبار مقترحة**: `-1000`, `-1500.50`, `1000`, `0`, `-0.01`
3. **اختبار SweetAlert** للمقاولين
4. **تحقق من صحة التحويل** من نص إلى رقم

### كيفية الاختبار:
1. فتح `test-negative-balance-input.html`
2. إدخال قيم مختلفة (موجبة وسالبة)
3. النقر على "اختبار القيمة"
4. التحقق من النتائج

## أمثلة على القيم المدعومة الآن

### قيم صالحة ✅
- `-1000` → -1000 (سالب)
- `-1500.50` → -1500.5 (سالب بكسور)
- `1000` → 1000 (موجب)
- `0` → 0 (متوازن)
- `-0.01` → -0.01 (سالب صغير)
- `+500` → 500 (موجب مع علامة)

### قيم غير صالحة (ستُحول إلى 0) ⚠️
- `abc` → 0
- `` (فارغ) → 0
- `--100` → 0

## التأثير على النظام

### 1. قاعدة البيانات ✅
- لا تغيير مطلوب - الحقول من نوع `FLOAT` تدعم القيم السالبة
- التحويل يتم في JavaScript قبل الإرسال

### 2. العمليات الحسابية ✅
- جميع العمليات الحسابية تعمل بنفس الطريقة
- المنطق المالي لم يتغير

### 3. العرض ✅
- العرض يتعامل مع القيم السالبة بشكل صحيح
- التسميات "(له)" و "(عليه)" تعمل كما هو مطلوب

## الحالة: مكتمل ✅

تم تعديل جميع الحقول المطلوبة:
1. ✅ العملاء - نموذج الإضافة
2. ✅ العملاء - نموذج التعديل  
3. ✅ المقاولين - نموذج التعديل
4. ✅ المقاولين - نموذج الإضافة (SweetAlert)
5. ✅ الكسارات - لا تحتاج تعديل (لا يوجد رصيد افتتاحي)

الآن يمكن إدخال القيم السالبة بسهولة في جميع نماذج الرصيد الافتتاحي.