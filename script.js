// ================ قواعد البيانات المدمجة بالمتصفح ================
let customers = JSON.parse(localStorage.getItem('almoamal_c_db')) || [];
let inventory = JSON.parse(localStorage.getItem('almoamal_i_db')) || [];
let monthlySales = JSON.parse(localStorage.getItem('almoamal_ms_db')) || [];
let activeCustomer = null;

function saveData() {
    localStorage.setItem('almoamal_c_db', JSON.stringify(customers));
    localStorage.setItem('almoamal_i_db', JSON.stringify(inventory));
    localStorage.setItem('almoamal_ms_db', JSON.stringify(monthlySales));
    updateAlertBadge();
}

// ================ تنسيق الأرقام بـ(نقطة الألف) ================
function formatMoney(amount) {
    return Number(amount || 0).toLocaleString('en-US');
}
function parseMoney(str) {
    return Number(str.toString().replace(/,/g, '')) || 0;
}

// تطبيق فاصلة الألف تلقائياً على كل حقل يحمل كلاس money-input
document.querySelectorAll('.money-input').forEach(inp => {
    inp.addEventListener('input', function() {
        let val = this.value.replace(/\D/g, ''); // منع كتابة الحروف
        this.value = val ? parseInt(val).toLocaleString('en-US') : '';
    });
});

// ================ التنقل بين التبويبات ================
function switchTab(tab, btn) {
    document.querySelectorAll('.tab-section').forEach(t => { t.classList.remove('active'); t.classList.add('hidden'); });
    document.getElementById('tab-' + tab).classList.remove('hidden');
    document.getElementById('tab-' + tab).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(b => { b.classList.remove('active'); b.classList.add('text-slate-400'); b.classList.remove('text-primary'); });
    btn.classList.add('active', 'text-primary');
    btn.classList.remove('text-slate-400');

    if(tab === 'customers') renderCustomers();
    if(tab === 'inventory') renderInventory();
    if(tab === 'alerts') renderAlerts();
    if(tab === 'monthlysale') renderMonthlySales();
}

// ================ التحكم بالنوافذ المنبثقة ================
function openModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('hidden');
    
    // تصفير الحقول إذا كانت الإضافة جديدة
    if(id === 'customerModal' && !document.getElementById('c-id').value) {
        document.getElementById('c-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('c-alert').value = '30';
    }
    if(id === 'sellModal') {
        document.getElementById('s-search').value = '';
        document.getElementById('s-dropdown').classList.add('hidden');
        document.getElementById('s-info').classList.add('hidden');
    }

    setTimeout(() => {
        modal.classList.add('modal-show');
        let box = modal.querySelector('.modal-box, .modal-box-slide');
        if(box) box.classList.add(box.classList.contains('modal-box') ? 'modal-box-show' : 'modal-box-slide-show');
    }, 10);
}

function closeModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('modal-show');
    let box = modal.querySelector('.modal-box, .modal-box-slide');
    if(box) box.classList.remove(box.classList.contains('modal-box') ? 'modal-box-show' : 'modal-box-slide-show');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        if(id === 'customerModal' || id === 'inventoryModal') {
            document.querySelectorAll(`#${id} input`).forEach(i => i.value = ''); // تنظيف الحقول
        }
    }, 300);
}

function toastMsg(msg, iconStr = 'success') {
    Swal.fire({ title: msg, icon: iconStr, toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
}

// ================ إدارة الزبائن ================
function getCustomerBalance(c) {
    let bal = 0;
    (c.transactions || []).forEach(t => {
        if(t.type === 'sell') bal += t.total;
        if(t.type === 'pay') bal -= t.amount;
    });
    return bal;
}

function renderCustomers(searchTerm = '') {
    const list = document.getElementById('customersList');
    list.innerHTML = '';
    
    let filteredCustomers = customers;
    if (searchTerm.trim() !== '') {
        filteredCustomers = customers.filter(c => c.name.includes(searchTerm));
    }
    
    filteredCustomers.forEach(c => {
        let bal = getCustomerBalance(c);
        list.innerHTML += `
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex justify-between items-center active:scale-95 transition cursor-pointer" onclick="openDetails('${c.id}')">
                <div class="flex flex-col gap-1">
                    <h3 class="font-bold text-lg text-slate-800">${c.name}</h3>
                    <div class="text-[11px] font-bold ${bal > 0 ? 'text-red-500 bg-red-50' : 'text-primary bg-light'} px-2 py-1 rounded w-fit">الباقي: <span dir="ltr">${formatMoney(bal)}</span> د.ع</div>
                </div>
                <div class="flex gap-2" onclick="event.stopPropagation()">
                    <button class="w-10 h-10 rounded-full bg-slate-50 text-secondary hover:bg-slate-200 transition" onclick="editCustomer('${c.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="w-10 h-10 rounded-full bg-red-50 text-red-500 hover:bg-red-200 transition" onclick="deleteCustomer('${c.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
    });
    
    if(!filteredCustomers.length) {
        list.innerHTML = '<div class="text-center text-slate-400 mt-10"><i class="fa-solid fa-users text-4xl mb-2"></i><br>لا يوجد زبائن</div>';
    }
}

function searchCustomers(val) {
    renderCustomers(val);
}

function saveCustomer() {
    let id = document.getElementById('c-id').value;
    let name = document.getElementById('c-name').value;
    let phone = document.getElementById('c-phone').value;
    let guarantor = document.getElementById('c-guarantor').value;
    let gphone = document.getElementById('c-gphone').value;
    let date = document.getElementById('c-date').value;
    let alertDays = document.getElementById('c-alert').value;

    if(!name || !date || !alertDays) return toastMsg('يرجى ملء الاسم والتاريخ والتنبيه', 'error');

    let obj = { name, phone, guarantor, guarantorPhone: gphone, date, alertDays: parseInt(alertDays) };
    if(id) {
        let idx = customers.findIndex(c => c.id == id);
        customers[idx] = { ...customers[idx], ...obj };
    } else {
        customers.push({ id: Date.now().toString(), ...obj, transactions: [] });
    }
    saveData(); closeModal('customerModal'); renderCustomers(); toastMsg('تم حفظ الزبون');
}

function editCustomer(id) {
    let c = customers.find(c => c.id == id);
    document.getElementById('c-id').value = c.id;
    document.getElementById('c-name').value = c.name;
    document.getElementById('c-phone').value = c.phone;
    document.getElementById('c-guarantor').value = c.guarantor;
    document.getElementById('c-gphone').value = c.guarantorPhone;
    document.getElementById('c-date').value = c.date;
    document.getElementById('c-alert').value = c.alertDays;
    document.getElementById('customerModalTitle').innerText = 'تعديل زبون';
    openModal('customerModal');
}

function deleteCustomer(id) {
    Swal.fire({
        title: 'هل أنت متأكد؟', text: "سيتم حذف الزبون وسجلاته وجميع ديونه نهائياً!", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#64748b', confirmButtonText: 'نعم، احذف', cancelButtonText: 'إلغاء'
    }).then((result) => {
        if (result.isConfirmed) { customers = customers.filter(c => c.id != id); saveData(); renderCustomers(); toastMsg('تم الحذف'); }
    });
}

// ================ إدارة المخزون ================
function renderInventory() {
    const list = document.getElementById('inventoryList');
    list.innerHTML = '';
    inventory.forEach(i => {
        list.innerHTML += `
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex justify-between items-center">
                <div class="flex flex-col gap-1">
                    <h3 class="font-bold text-lg text-slate-800">${i.name}</h3>
                    <div class="flex gap-2 text-[11px] font-bold text-slate-500">
                        <span class="bg-slate-100 px-2 py-1 rounded">العدد: <span class="${i.qty > 0 ? 'text-primary' : 'text-red-500'}">${i.qty}</span></span>
                        <span class="bg-light text-primary px-2 py-1 rounded" dir="ltr">سعر البيع: ${formatMoney(i.sellPrice)}</span>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button class="w-10 h-10 rounded-full bg-slate-50 text-secondary hover:bg-slate-200 transition" onclick="editInventory('${i.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="w-10 h-10 rounded-full bg-red-50 text-red-500 hover:bg-red-200 transition" onclick="deleteInventory('${i.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
    });
    if(!inventory.length) list.innerHTML = '<div class="text-center text-slate-400 mt-10"><i class="fa-solid fa-box-open text-4xl mb-2"></i><br>المخزون فارغ</div>';
}

function saveInventory() {
    let id = document.getElementById('i-id').value;
    let name = document.getElementById('i-name').value;
    let buy = parseMoney(document.getElementById('i-buy').value);
    let sell = parseMoney(document.getElementById('i-sell').value);
    let qty = document.getElementById('i-qty').value;

    if(!name || !sell || !qty) return toastMsg('يرجى ملء الاسم والسعر والعدد', 'error');

    let obj = { name, buyPrice: buy, sellPrice: sell, qty: parseInt(qty) };
    if(id) {
        let idx = inventory.findIndex(i => i.id == id);
        inventory[idx] = { ...inventory[idx], ...obj };
    } else {
        inventory.push({ id: Date.now().toString(), ...obj });
    }
    saveData(); closeModal('inventoryModal'); renderInventory(); toastMsg('تم حفظ المادة');
}

function editInventory(id) {
    let i = inventory.find(i => i.id == id);
    document.getElementById('i-id').value = i.id;
    document.getElementById('i-name').value = i.name;
    document.getElementById('i-buy').value = formatMoney(i.buyPrice);
    document.getElementById('i-sell').value = formatMoney(i.sellPrice);
    document.getElementById('i-qty').value = i.qty;
    document.getElementById('inventoryModalTitle').innerText = 'تعديل مادة';
    openModal('inventoryModal');
}

function deleteInventory(id) {
    Swal.fire({
        title: 'حذف المادة؟', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#64748b', confirmButtonText: 'احذف', cancelButtonText: 'إلغاء'
    }).then((result) => {
        if (result.isConfirmed) { inventory = inventory.filter(i => i.id != id); saveData(); renderInventory(); toastMsg('تم الحذف'); }
    });
}

// ================ تفاصيل ومعاملات الزبون (بيع / تسديد) ================
function openDetails(id) {
    activeCustomer = customers.find(c => c.id == id);
    document.getElementById('d-name').innerText = activeCustomer.name;
    updateDetails();
    document.getElementById('detailsModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('detailsModal').classList.remove('translate-y-full'), 10);
}

function closeDetails() {
    document.getElementById('detailsModal').classList.add('translate-y-full');
    setTimeout(() => document.getElementById('detailsModal').classList.add('hidden'), 400);
    renderCustomers();
}

function updateDetails() {
    document.getElementById('d-balance').innerText = formatMoney(getCustomerBalance(activeCustomer));
    let list = document.getElementById('d-transactions');
    list.innerHTML = '';
    let trans = [...(activeCustomer.transactions || [])].reverse();
    if(!trans.length) list.innerHTML = '<p class="text-center text-slate-400 mt-5 font-bold">لم يقم بأي معاملة بعد</p>';
    
    trans.forEach(t => {
        let isSell = t.type === 'sell';
        list.innerHTML += `
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-full flex items-center justify-center ${isSell ? 'bg-red-50 text-red-500' : 'bg-light text-primary'}">
                        <i class="fa-solid ${isSell ? 'fa-cart-arrow-down' : 'fa-hand-holding-dollar'} text-xl"></i>
                    </div>
                    <div class="flex flex-col">
                        <h4 class="font-bold text-slate-800 text-sm">${isSell ? 'شراء: ' + t.itemName : 'تسديد مبلغ'}</h4>
                        <div class="text-[10px] text-slate-400 font-bold">${t.date}</div>
                    </div>
                </div>
                <div class="font-black text-lg ${isSell ? 'text-red-500' : 'text-primary'}" dir="ltr">
                    ${isSell ? '+' : '-'}${formatMoney(isSell ? t.total : t.amount)}
                </div>
            </div>`;
    });
}

// ---------------- الفهرسة والبيع ----------------
function openSellModal() { openModal('sellModal'); }

function searchInventory(val) {
    let dropdown = document.getElementById('s-dropdown');
    dropdown.innerHTML = '';
    if(!val.trim()) { dropdown.classList.add('hidden'); return; }
    
    // فهرسة ذكية: تبحث إذا كانت المادة متوفرة وتحتوي على الحرف
    let matches = inventory.filter(i => i.name.includes(val) && i.qty > 0);
    if(matches.length > 0) {
        matches.forEach(m => {
            dropdown.innerHTML += `
                <div class="p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer font-bold text-slate-700 flex justify-between items-center" onclick="selectSellItem('${m.id}')">
                    <span>${m.name}</span> <span class="text-xs bg-light text-primary px-2 py-1 rounded">متوفر: ${m.qty}</span>
                </div>`;
        });
        dropdown.classList.remove('hidden');
    } else {
        dropdown.innerHTML = '<div class="p-3 text-slate-400 text-sm font-bold text-center">لا توجد مادة متوفرة بهذا الاسم</div>';
        dropdown.classList.remove('hidden');
    }
}

function selectSellItem(id) {
    let item = inventory.find(i => i.id == id);
    document.getElementById('s-search').value = item.name;
    document.getElementById('s-dropdown').classList.add('hidden');
    
    document.getElementById('s-item-id').value = item.id;
    document.getElementById('s-item-name').innerText = item.name;
    document.getElementById('s-item-stock').innerText = item.qty;
    document.getElementById('s-price').value = formatMoney(item.sellPrice);
    document.getElementById('s-qty').value = 1;
    document.getElementById('s-qty').max = item.qty;
    
    document.getElementById('s-info').classList.remove('hidden');
    calcTotal();
}

function calcTotal() {
    let price = parseMoney(document.getElementById('s-price').value);
    let qty = parseInt(document.getElementById('s-qty').value) || 0;
    document.getElementById('s-total').innerText = formatMoney(price * qty);
}

function confirmSell() {
    let itemId = document.getElementById('s-item-id').value;
    let price = parseMoney(document.getElementById('s-price').value);
    let qty = parseInt(document.getElementById('s-qty').value);
    
    if(!itemId || !price || !qty) return toastMsg('الرجاء اختيار المادة وتحديد السعر', 'error');
    
    let invIdx = inventory.findIndex(i => i.id == itemId);
    if(qty > inventory[invIdx].qty) return toastMsg('عذراً! الكمية المطلوبة غير متوفرة', 'error');

    inventory[invIdx].qty -= qty; // الخصم من المخزون التلقائي
    
    // إضافة السلعة وحساب السعر المكتوب لظهر الزبون
    activeCustomer.transactions.push({
        id: Date.now().toString(), type: 'sell', itemId, itemName: inventory[invIdx].name, price, qty, total: price * qty, date: new Date().toLocaleDateString('en-GB')
    });
    activeCustomer.date = new Date().toISOString().split('T')[0]; // تصفير التنبيه
    
    saveData(); closeModal('sellModal'); updateDetails(); toastMsg('تم البيع والخصم من المخزون'); renderInventory();
}

// ---------------- التسديد ----------------
function openPayModal() {
    document.getElementById('p-remain').innerText = formatMoney(getCustomerBalance(activeCustomer));
    document.getElementById('p-amount').value = '';
    openModal('payModal');
}

function confirmPay() {
    let amt = parseMoney(document.getElementById('p-amount').value);
    if(!amt || amt <= 0) return toastMsg('يرجى إدخال مبلغ صحيح', 'error');

    activeCustomer.transactions.push({
        id: Date.now().toString(), type: 'pay', amount: amt, date: new Date().toLocaleDateString('en-GB')
    });
    activeCustomer.date = new Date().toISOString().split('T')[0]; // تصفير التنبيه
    
    saveData(); closeModal('payModal'); updateDetails(); toastMsg('تم استلام المبلغ');
}

// ================ التنبيهات الذكية ================
function renderAlerts() {
    const list = document.getElementById('alertsList');
    list.innerHTML = '';
    let today = new Date().getTime();
    let hasAlerts = false;

    customers.forEach(c => {
        let bal = getCustomerBalance(c);
        if(bal > 0) { // يحسب الأيام فقط إذا كان عليه ديون
            let diffDays = Math.floor((today - new Date(c.date).getTime()) / (1000 * 3600 * 24));
            if(diffDays >= c.alertDays) {
                hasAlerts = true;
                list.innerHTML += `
                    <div class="bg-red-50 rounded-2xl p-4 border border-red-100 flex items-center gap-4 cursor-pointer active:scale-95 transition" onclick="openDetails('${c.id}')">
                        <div class="bg-red-500 text-white w-12 h-12 rounded-full flex justify-center items-center text-xl shrink-0 shadow-md">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-800 text-lg">${c.name}</h3>
                            <p class="text-xs font-bold text-red-500 mt-1">تجاوز المدة (${c.alertDays} يوم)</p>
                            <p class="text-sm text-slate-600 mt-1 font-bold">المطلوب: <span dir="ltr">${formatMoney(bal)}</span> د.ع</p>
                        </div>
                    </div>`;
            }
        }
    });
    if(!hasAlerts) list.innerHTML = `<div class="text-center py-10"><i class="fa-solid fa-check-circle text-6xl text-primary mb-4 opacity-50"></i><p class="font-bold text-slate-500 text-lg">لا يوجد زبائن متأخرين حالياً</p></div>`;
}

function updateAlertBadge() {
    let today = new Date().getTime(); let count = 0;
    customers.forEach(c => {
        if(getCustomerBalance(c) > 0) {
            let diffDays = Math.floor((today - new Date(c.date).getTime()) / (1000 * 3600 * 24)); 
            if(diffDays >= c.alertDays) count++;
        }
    });
    let badge = document.getElementById('alertBadge');
    if(count > 0) { badge.innerText = count; badge.classList.remove('hidden'); } 
    else { badge.classList.add('hidden'); }
}

// ================ البيع الشهري ================

function openMonthlySaleModal() {
    document.getElementById('ms-id').value = '';
    document.getElementById('ms-c-name').value = '';
    document.getElementById('ms-phone').value = '';
    document.getElementById('ms-price').value = '';
    document.getElementById('ms-search').value = '';
    document.getElementById('ms-item-id').value = '';
    document.getElementById('monthlySaleModalTitle').innerText = 'إضافة عملية بيع';
    openModal('monthlySaleModal');
}

function searchMsInventory(val) {
    let dropdown = document.getElementById('ms-dropdown');
    dropdown.innerHTML = '';
    if(!val.trim()) { dropdown.classList.add('hidden'); return; }
    
    let matches = inventory.filter(i => i.name.includes(val) && i.qty > 0);
    if(matches.length > 0) {
        matches.forEach(m => {
            dropdown.innerHTML += `
                <div class="p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer font-bold text-slate-700 flex justify-between items-center" onclick="selectMsItem('${m.id}')">
                    <span>${m.name}</span> <span class="text-xs bg-light text-primary px-2 py-1 rounded">المخزون: ${m.qty}</span>
                </div>`;
        });
        dropdown.classList.remove('hidden');
    } else {
        dropdown.innerHTML = '<div class="p-3 text-slate-400 text-sm font-bold text-center">لا توجد مادة متوفرة</div>';
        dropdown.classList.remove('hidden');
    }
}

function selectMsItem(id) {
    let item = inventory.find(i => i.id == id);
    document.getElementById('ms-search').value = item.name;
    document.getElementById('ms-item-id').value = item.id;
    document.getElementById('ms-dropdown').classList.add('hidden');
}

function saveMonthlySale() {
    let id = document.getElementById('ms-id').value;
    let cName = document.getElementById('ms-c-name').value;
    let phone = document.getElementById('ms-phone').value;
    let price = parseMoney(document.getElementById('ms-price').value);
    let itemName = document.getElementById('ms-search').value;
    let itemId = document.getElementById('ms-item-id').value;

    if(!cName || !price) return toastMsg('يرجى ملء اسم الزبون والسعر', 'error');

    let d = new Date();
    let month = d.getMonth() + 1;
    let dateStr = d.toLocaleDateString('en-GB');

    if(id) {
        let idx = monthlySales.findIndex(m => m.id == id);
        monthlySales[idx] = { ...monthlySales[idx], customerName: cName, phone: phone, price: price, itemName: itemName, itemId: itemId };
    } else {
        if(itemId) {
            let invIdx = inventory.findIndex(i => i.id == itemId);
            if(invIdx >= 0 && inventory[invIdx].qty > 0) {
                inventory[invIdx].qty -= 1;
            }
        }
        monthlySales.push({ 
            id: Date.now().toString(), 
            customerName: cName, 
            phone: phone, 
            price: price, 
            itemName: itemName, 
            itemId: itemId, 
            date: dateStr, 
            month: month 
        });
    }
    
    saveData(); 
    closeModal('monthlySaleModal'); 
    renderMonthlySales(); 
    toastMsg('تم حفظ العملية');
}

function renderMonthlySales() {
    const list = document.getElementById('monthlySaleList');
    list.innerHTML = '';
    
    let filterMonth = parseInt(document.getElementById('msMonthFilterList').value);
    let filtered = monthlySales;
    
    if(filterMonth > 0) {
        filtered = monthlySales.filter(m => m.month === filterMonth);
    }

    let totalProfits = 0;
    
    filtered.slice().reverse().forEach(m => {
        totalProfits += m.price;
        list.innerHTML += `
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex justify-between items-center">
                <div class="flex flex-col gap-1">
                    <h3 class="font-bold text-lg text-slate-800">${m.customerName}</h3>
                    <div class="text-[11px] font-bold text-slate-500">
                        رقم: ${m.phone || '-'} | المادة: ${m.itemName || '-'} | ${m.date}
                    </div>
                    <div class="text-sm font-black text-primary mt-1" dir="ltr">${formatMoney(m.price)} د.ع</div>
                </div>
                <div class="flex gap-2">
                    <button class="w-10 h-10 rounded-full bg-slate-50 text-secondary hover:bg-slate-200 transition" onclick="editMonthlySale('${m.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="w-10 h-10 rounded-full bg-red-50 text-red-500 hover:bg-red-200 transition" onclick="deleteMonthlySale('${m.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
    });
    
    document.getElementById('ms-total-profits').innerText = formatMoney(totalProfits);

    if(!filtered.length) {
        list.innerHTML = '<div class="text-center text-slate-400 mt-10"><i class="fa-solid fa-calendar-xmark text-4xl mb-2"></i><br>لا توجد مبيعات</div>';
    }
}

function editMonthlySale(id) {
    let m = monthlySales.find(x => x.id == id);
    document.getElementById('ms-id').value = m.id;
    document.getElementById('ms-c-name').value = m.customerName;
    document.getElementById('ms-phone').value = m.phone || '';
    document.getElementById('ms-price').value = formatMoney(m.price);
    document.getElementById('ms-search').value = m.itemName || '';
    document.getElementById('ms-item-id').value = m.itemId || '';
    document.getElementById('monthlySaleModalTitle').innerText = 'تعديل عملية بيع';
    openModal('monthlySaleModal');
}

function deleteMonthlySale(id) {
    Swal.fire({
        title: 'حذف عملية البيع؟', text: "لن يتم استرجاع العدد للمخزون تلقائياً", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#64748b', confirmButtonText: 'احذف', cancelButtonText: 'إلغاء'
    }).then((result) => {
        if (result.isConfirmed) { 
            monthlySales = monthlySales.filter(m => m.id != id); 
            saveData(); 
            renderMonthlySales(); 
            toastMsg('تم الحذف'); 
        }
    });
}

function clearMonthlySales() {
    Swal.fire({
        title: 'تصفير الأرباح؟', text: "سيتم مسح جميع عمليات البيع الشهري والأرباح بشكل نهائي!", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#64748b', confirmButtonText: 'نعم، صَفِّر', cancelButtonText: 'إلغاء'
    }).then((result) => {
        if (result.isConfirmed) { 
            monthlySales = []; 
            saveData(); 
            renderMonthlySales(); 
            toastMsg('تم التصفير'); 
        }
    });
}

// ================ أنيميشن البيع المباشر (3D) ================
function showMaintenance() {
    let t = document.getElementById('maintenanceToast');
    let b = t.querySelector('.maintenance-3d-box');
    t.classList.remove('hidden');
    setTimeout(() => {
        t.classList.add('opacity-100');
        b.classList.add('show-3d');
    }, 10);
    
    // إخفاء تلقائي بعد 3 ثواني
    setTimeout(() => {
        t.classList.remove('opacity-100');
        b.classList.remove('show-3d');
        setTimeout(() => t.classList.add('hidden'), 300);
    }, 3000);
}

// الإقلاع
window.onload = () => { renderCustomers(); updateAlertBadge(); renderMonthlySales(); };
