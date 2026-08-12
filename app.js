// app.js - منطق احتساب ضريبة الدخل والتحكم بالواجهة

function round4(value) {
    return Math.round(value * 10000) / 10000;
}

class TaxDeduction {
    constructor() {
        this.currNetBasicSal = 0.0;
        this.curSumded = 0.0;
        this.childcountVal = 0;
        this.intchildcoun = 0.0;
        this.bytmstate = 1; // 1 = أعزب, 2 = متزوج, 3 = مطلق, 4 = أرمل
        this.boolgender = true; // true = ذكر, false = أنثى
        this.booljobanother = false;
        this.boolageflag = false;
        this.boolhusbandnotwork = false;
        this.currmrgpay = 0.0;
        this.addchildren = false;
        this.despartchildren = false;
        this.pay_tax = 0.0;
    }

    set childcount(val) {
        this.childcountVal = Number(val) || 0;
        this.intchildcoun = this.childcountVal * 16666.66;
    }
    
    get childcount() {
        return this.childcountVal;
    }

    materialStatusAllowance() {
        let allowance = 0.0;
        
        if (this.bytmstate === 1) {
            allowance = 208333.33;
        } else if (this.bytmstate === 2) {
            if (this.booljobanother) { // الشريك موظف
                if (this.currmrgpay !== 0.0) { // دمج ضريبة
                    allowance = 375000.0 + this.intchildcoun;
                } else {
                    if (this.boolgender) { // ذكر
                        if (this.despartchildren) { // فصل سماح الأبناء
                            allowance = 208333.33;
                        } else {
                            allowance = 208333.33 + this.intchildcoun;
                        }
                    } else { // أنثى
                        if (this.addchildren) { // دمج الأبناء مع الأم
                            allowance = 208333.33 + this.intchildcoun;
                        } else {
                            allowance = 208333.33;
                        }
                    }
                }
            } else { // الشريك لا يعمل
                allowance = 375000.0 + this.intchildcoun;
            }
            
            // إذا كانت أنثى والزوج عاجز عن العمل
            if (!this.boolgender && this.boolhusbandnotwork) {
                allowance = 416666.66 + this.intchildcoun;
            }
        } else if (this.bytmstate === 3 || this.bytmstate === 4) { // مطلق / أرمل
            if (this.boolgender) { // ذكر
                allowance = 208333.33 + this.intchildcoun;
            } else { // أنثى
                allowance = 266666.66 + this.intchildcoun;
            }
        }
        
        // سماح السن (> 63 سنة)
        if (this.boolageflag) {
            allowance += 25000.0;
        }
        
        return allowance;
    }

    get amount() {
        let calamount = 0.0;
        if (this.currmrgpay !== 0.0) {
            calamount = (this.currmrgpay + this.currNetBasicSal) - (this.curSumded + this.materialStatusAllowance());
        } else {
            calamount = this.currNetBasicSal - (this.curSumded + this.materialStatusAllowance());
        }
        
        calamount = round4(calamount);
        this.pay_tax = calamount;
        
        if (calamount < 0) {
            return 0.0;
        }
        
        let amount_val = 0.0;
        
        // خوارزمية احتساب الشرائح الضريبية الأصلية من VB6 كما هي
        if (calamount > 83333) {
            let calamount_remaining = round4(calamount - 83333);
            amount_val = 5834.0 + (calamount_remaining * 0.15);
        } else {
            if (calamount <= 20833) {
                amount_val = calamount * 0.03;
            } else {
                let calamount_remaining = round4(calamount - 20833);
                amount_val = 625.0;
                if (calamount_remaining >= 20833) {
                    calamount_remaining = round4(calamount_remaining - 20833);
                    if (calamount_remaining >= 41667) {
                        calamount_remaining = round4(calamount_remaining - 41667);
                        amount_val += 1042.0;
                        if (calamount_remaining < 83333) {
                            amount_val += (calamount_remaining * 0.1);
                        }
                    } else {
                        amount_val += 1042.0;
                        amount_val += (calamount_remaining * 0.1);
                    }
                } else {
                    amount_val += (calamount_remaining * 0.05);
                }
            }
        }
        
        // إزالة الكسر كما هو في كود VB6 الأصلي
        amount_val = Math.floor(amount_val);
        return amount_val;
    }

    getCalculationBreakdown() {
        let steps = [];
        steps.push(`• الراتب الأساسي: ${this.currNetBasicSal.toLocaleString()} دينار`);
        if (this.currmrgpay !== 0.0) {
            steps.push(`• راتب الشريك المدمج: ${this.currmrgpay.toLocaleString()} دينار`);
            steps.push(`• إجمالي الدخل: ${(this.currNetBasicSal + this.currmrgpay).toLocaleString()} دينار`);
        }
        
        steps.push(`• التوقيفات التقاعدية المخصومة: ${this.curSumded.toLocaleString()} دينار`);
        
        let allowance = this.materialStatusAllowance();
        steps.push(`• إجمالي السماح الضريبي الممنوح: ${allowance.toLocaleString('ar-EG', {minimumFractionDigits: 2, maximumFractionDigits: 2})} دينار`);
        
        const mstate_names = {1: "أعزب", 2: "متزوج", 3: "مطلق", 4: "أرمل"};
        let mstate_desc = mstate_names[this.bytmstate] || "غير معروف";
        steps.push(`  - الحالة الاجتماعية: ${mstate_desc}`);
        if (this.bytmstate === 2) {
            if (this.booljobanother) {
                steps.push("  - الشريك موظف");
                if (this.currmrgpay !== 0.0) {
                    steps.push("  - تم دمج ضريبة الزوجين");
                } else {
                    if (this.boolgender) {
                        if (this.despartchildren) {
                            steps.push("  - تم فصل سماح الأطفال عن الأب");
                        } else {
                            steps.push("  - سماح الأطفال مضاف للأب");
                        }
                    } else {
                        if (this.addchildren) {
                            steps.push("  - تم دمج سماح الأطفال مع الأم");
                        }
                    }
                }
            } else {
                steps.push("  - الشريك لا يعمل / قطاع خاص");
            }
            
            if (!this.boolgender && this.boolhusbandnotwork) {
                steps.push("  - الزوج عاجز عن العمل (سماح إضافي)");
            }
        }
        
        if (this.intchildcoun > 0) {
            steps.push(`  - سماح الأطفال المالي: ${this.intchildcoun.toLocaleString()} دينار (عدد الأطفال: ${this.childcountVal})`);
        }
        if (this.boolageflag) {
            steps.push("  - سماح السن المضاف (> 63 سنة): 25,000.00 دينار");
        }
        
        let calamount = this.pay_tax;
        steps.push(`\n• الوعاء الخاضع للضريبة = (إجمالي الدخل) - (التقاعد + السماح الضريبي) = ${calamount.toLocaleString('ar-EG', {minimumFractionDigits: 2, maximumFractionDigits: 2})} دينار`);
        
        if (calamount <= 0) {
            steps.push("  - الوعاء الضريبي صفر أو أقل، لا توجد ضريبة مستحقة.");
            steps.push("• الضريبة النهائية: 0 دينار");
            return steps.join("\n");
        }
        
        steps.push("\n• احتساب الشرائح الضريبية:");
        let amount_val = 0.0;
        let rem = calamount;
        
        if (rem > 83333) {
            steps.push("  - الشريحة الأولى (3%): 20,833.00 * 3% = 625 دينار");
            steps.push("  - الشريحة الثانية (5%): 20,833.00 * 5% = 1,042 دينار");
            steps.push("  - الشريحة الثالثة (10%): 41,667.00 * 10% = 4,167 دينار");
            let fourth_val = round4(rem - 83333);
            let fourth_tax = fourth_val * 0.15;
            steps.push(`  - الشريحة الرابعة (15%): ${fourth_val.toLocaleString()} * 15% = ${fourth_tax.toLocaleString('ar-EG', {maximumFractionDigits: 2})} دينار`);
            amount_val = 5834.0 + fourth_tax;
        } else {
            if (rem <= 20833) {
                let first_tax = rem * 0.03;
                steps.push(`  - الشريحة الأولى (3%): ${rem.toLocaleString()} * 3% = ${first_tax.toLocaleString('ar-EG', {maximumFractionDigits: 2})} دينار`);
                amount_val = first_tax;
            } else {
                steps.push("  - الشريحة الأولى (3%): 20,833.00 * 3% = 625 دينار");
                rem = round4(rem - 20833);
                amount_val = 625.0;
                if (rem >= 20833) {
                    rem = round4(rem - 20833);
                    if (rem >= 41667) {
                        let rem_after = round4(rem - 41667);
                        let bracket3_tax = rem_after * 0.1;
                        steps.push("  - الشريحة الثانية (5%): 20,833.00 * 5% = 1,042 دينار");
                        steps.push(`  - الشريحة الثالثة (10%): تم خصم 41,667 دينار، مع تطبيق 10% على المتبقي (${rem_after.toLocaleString()} * 10% = ${bracket3_tax.toLocaleString('ar-EG', {maximumFractionDigits: 2})} دينار)`);
                        amount_val += 1042.0 + bracket3_tax;
                    } else {
                        let bracket3_tax = rem * 0.1;
                        steps.push("  - الشريحة الثانية (5%): 20,833.00 * 5% = 1,042 دينار");
                        steps.push(`  - الشريحة الثالثة (10%): ${rem.toLocaleString()} * 10% = ${bracket3_tax.toLocaleString('ar-EG', {maximumFractionDigits: 2})} دينار`);
                        amount_val += 1042.0 + bracket3_tax;
                    }
                } else {
                    let second_tax = rem * 0.05;
                    steps.push(`  - الشريحة الثانية (5%): ${rem.toLocaleString()} * 5% = ${second_tax.toLocaleString('ar-EG', {maximumFractionDigits: 2})} دينار`);
                    amount_val += second_tax;
                }
            }
        }
        
        let final_tax = Math.floor(amount_val);
        steps.push(`\n• الضريبة الإجمالية المحتسبة = ${final_tax.toLocaleString()} دينار (بعد إزالة الكسور)`);
        return steps.join("\n");
    }
}

// عناصر واجهة المستخدم والتحكم
document.addEventListener("DOMContentLoaded", () => {
    const txtSal = document.getElementById("txtsal");
    const cmbMstate = document.getElementById("cmb_mstate");
    const txtChild = document.getElementById("txtchild");
    const radMale = document.getElementById("rad_male");
    const radFemale = document.getElementById("rad_female");
    const radClerk = document.getElementById("rad_clerk");
    const radNoJob = document.getElementById("rad_no_job");
    const chkLeave = document.getElementById("chk_leave");
    const chkAge = document.getElementById("chk_age");
    const chkHusbandDisabled = document.getElementById("chk_husband_disabled");
    const chkSepChild = document.getElementById("chk_sep_child");
    const chkMergeMother = document.getElementById("chk_merge_mother");
    const chkMergeSpouse = document.getElementById("chk_merge_spouse");
    const txtSpouseSal = document.getElementById("txt_spouse_sal");
    const btnCalc = document.getElementById("btn_calc");
    
    const outTax = document.getElementById("out_tax");
    const outRetirement = document.getElementById("out_retirement");
    const outTaxable = document.getElementById("out_taxable");
    const txtExplain = document.getElementById("txt_explain");

    function updateUI() {
        const isMarried = cmbMstate.value === "2";
        const isFemale = radFemale.checked;
        const isMale = radMale.checked;

        // طبيعة عمل الشريك والدمج
        if (isMarried) {
            radClerk.disabled = false;
            radNoJob.disabled = false;
            chkMergeSpouse.disabled = false;
        } else {
            radClerk.disabled = true;
            radNoJob.disabled = true;
            chkMergeSpouse.disabled = true;
            chkMergeSpouse.checked = false;
            txtSpouseSal.value = "0";
        }

        // تمكين حقل راتب الشريك
        if (chkMergeSpouse.checked && isMarried) {
            txtSpouseSal.disabled = false;
        } else {
            txtSpouseSal.disabled = true;
            txtSpouseSal.value = "0";
        }

        // خيارات عجز الزوج
        if (isFemale && isMarried) {
            chkHusbandDisabled.disabled = false;
        } else {
            chkHusbandDisabled.disabled = true;
            chkHusbandDisabled.checked = false;
        }

        // خيارات الأبناء
        if (isMale) {
            chkSepChild.disabled = false;
            chkMergeMother.disabled = true;
            chkMergeMother.checked = false;
        } else {
            chkSepChild.disabled = true;
            chkSepChild.checked = false;
            chkMergeMother.disabled = false;
        }

        calculateRetirement();
    }

    function calculateRetirement() {
        const salary = parseFloat(txtSal.value) || 0;
        const isLeave = chkLeave.checked;
        const retirement = isLeave ? salary * 0.25 : salary * 0.10;
        outRetirement.textContent = `التقاعد : ${Math.floor(retirement).toLocaleString()} دينار`;
    }

    // ربط الأحداث
    txtSal.addEventListener("input", calculateRetirement);
    chkLeave.addEventListener("change", calculateRetirement);
    cmbMstate.addEventListener("change", updateUI);
    radMale.addEventListener("change", updateUI);
    radFemale.addEventListener("change", updateUI);
    chkMergeSpouse.addEventListener("change", updateUI);

    btnCalc.addEventListener("click", () => {
        const salary = parseFloat(txtSal.value) || 0;
        const childCount = parseInt(txtChild.value) || 0;
        const isMarried = cmbMstate.value === "2";
        const spouseSalary = isMarried && chkMergeSpouse.checked ? (parseFloat(txtSpouseSal.value) || 0) : 0;
        
        const isLeave = chkLeave.checked;
        const retirement = isLeave ? salary * 0.25 : salary * 0.10;

        const calc = new TaxDeduction();
        calc.currNetBasicSal = salary;
        calc.curSumded = retirement;
        calc.childcount = childCount;
        calc.bytmstate = parseInt(cmbMstate.value);
        calc.boolgender = radMale.checked;
        calc.booljobanother = radClerk.checked && isMarried;
        calc.despartchildren = chkSepChild.checked;
        calc.addchildren = chkMergeMother.checked;
        calc.boolageflag = chkAge.checked;
        calc.boolhusbandnotwork = chkHusbandDisabled.checked && isMarried;
        calc.currmrgpay = spouseSalary;

        const tax = calc.amount;
        const taxable = calc.pay_tax;

        outTax.value = tax.toLocaleString() + " دينار";
        outTaxable.textContent = `راتب السماح الضريبي : ${taxable > 0 ? Math.floor(taxable).toLocaleString() : 0} دينار`;
        
        const breakdown = calc.getCalculationBreakdown();
        txtExplain.value = breakdown;
    });

    // تهيئة البداية
    updateUI();
});
