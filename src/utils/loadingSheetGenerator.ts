import { getAllProducts, getCartItems, Product } from '../services/productService';
import { Bill } from '../services/billService';

interface ProductLine {
    name: string;
    mrp: number;
    qty: number;
    unit: string;
    rate: number;
    amount: number;
}

interface CategoryGroup {
    categoryName: string;
    items: ProductLine[];
    totalQty: number;
    totalUnit: string;
    totalAmount: number;
}

interface ShopLine {
    sno: number;
    invoiceNo: number;
    partyName: string;
    amount: number;
}

function getCategoryForProductId(pid: string, products: Product[]): string {
    const p = products.find(p => p.id === pid);
    if (!p) return 'OTHER';
    
    const name = p.name.toUpperCase();
    const brand = p.brand.toUpperCase();

    if (brand === 'VARSHINI' || brand === 'ROSHINI') {
        if (name.includes('GROUNDNUT')) return 'GROUNDNUT OIL';
        return 'VARSHINI GOLD';
    }
    if (name.includes('LAMP') || name.includes('DEEPAM')) return 'PANJA DEEPA OIL';
    if (name.includes('CASTOR')) return 'CASTOR OIL';
    if (name.includes('GROUNDNUT')) return 'GROUNDNUT OIL';
    if (name.includes('COCONUT')) return 'COCONUT OIL';
    if (name.includes('GINGELLY')) return 'GINGELLY OIL';
    if (brand.includes('ROSI') || name.includes('PALM')) return 'PALM OIL';
    if (name.includes('NEEM') || name.includes('MAHUA')) return "LTR&NO'S";
    if (name.includes('CAKE')) return 'OIL CAKE';
    if (name.includes('BURFI')) return 'BURFI';
    
    return 'OTHER';
}

export function generateLoadingSheetHTML(bills: Bill[], dateStr: string, vehicleNo: string = '', isPlayer: boolean = false): string {
    const sortedBills = [...bills].sort((a, b) => a.invoice_no - b.invoice_no);
    const allProducts = getAllProducts();
    const productMap = new Map(allProducts.map(p => [p.id, p]));

    const aggregated: Record<string, { qty: number; rates: number[] }> = {};

    sortedBills.forEach(bill => {
        const customRates = bill.custom_rates || {};
        Object.entries(bill.cart).forEach(([pid, qty]) => {
            if (qty <= 0) return;
            if (!aggregated[pid]) aggregated[pid] = { qty: 0, rates: [] };
            aggregated[pid].qty += qty;
            
            const cleanPid = pid.replace(/_wl$/, '').replace(/_box_wl$/, '_box').replace(/_ltr_wl$/, '_ltr');
            const product = productMap.get(cleanPid);
            const basePid = cleanPid.replace(/_box$|_ltr$/, '');
            const isLtr = cleanPid.endsWith('_ltr');
            const isBox = cleanPid.endsWith('_box');
            const pBase = productMap.get(basePid);
            const baseSize = pBase?.size.toLowerCase() || '';
 
            let rate = customRates[pid] ?? customRates[cleanPid] ?? product?.price ?? 0;
            if (rate === 0) {
                const baseRate = customRates[basePid];
                if (baseRate !== undefined) {
                    let multiplier = 1;
                    if (isBox) {
                        multiplier = baseSize === '100 ml' ? 50 : baseSize === '200 ml' ? 25 : baseSize === '500 ml' ? 20 : (baseSize.includes('1 ltr') || baseSize.includes('1 litre')) ? 10 : baseSize.includes('2 ltr') ? 5 : 1;
                    } else if (isLtr) {
                        multiplier = baseSize === '100 ml' ? 10 : baseSize === '200 ml' ? 5 : baseSize === '500 ml' ? 2 : 1;
                    }
                    rate = baseRate * multiplier;
                }
            }
            aggregated[pid].rates.push(rate);
        });
    });
 
    const categoryMap: Record<string, ProductLine[]> = {};
    Object.entries(aggregated).forEach(([pid, data]) => {
        const cleanPid = pid.replace(/_wl$/, '').replace(/_box_wl$/, '_box').replace(/_ltr_wl$/, '_ltr');
        const product = productMap.get(cleanPid);
        if (!product) return;
 
        const category = getCategoryForProductId(cleanPid, allProducts);
        if (!categoryMap[category]) categoryMap[category] = [];
 
        const avgRate = data.rates.length > 0 ? data.rates.reduce((a, b) => a + b, 0) / data.rates.length : product.price;
 
        let description = `${product.name} ${product.size}`.toUpperCase();
        if (cleanPid === 'vs-gn-500ml-box' || cleanPid === 'vs-gn-1l-box') {
            description = description.replace(/\s*BOX$/i, '');
        }
 
        // Renames Box sizes strictly for the Loading Sheet view only
        description = description.replace('1 BOX (50X100ML)', '100ML BOX');
        description = description.replace('1 BOX (25X200ML)', '200ML BOX');
        description = description.replace('1 BOX (20X500ML)', '500ML BOX');
        description = description.replace('1 BOX (10X1L)', '1LTR BOX');
        description = description.replace('1 BOX (5X2L)', '2LTR BOX');
        description = description.replace('1 LTR (10X100ML)', '100ML');
        description = description.replace('1 LTR (5X200ML)', '200ML');
 
        if (pid.endsWith('_wl') || pid.includes('_wl')) {
            description = `${description} (WL)`;
        }
 
        let displayUnit = (product.unit || 'NOS').toUpperCase();
 
        if (cleanPid === 'vs-gn-500ml-box' || cleanPid === 'vs-gn-1l-box' || cleanPid.endsWith('-box')) {
            displayUnit = 'BOX';
        } else if (cleanPid.endsWith('_ltr') && (cleanPid.includes('100ml') || cleanPid.includes('200ml') || cleanPid.includes('500ml'))) {
            displayUnit = 'LTR';
        } else if (/\b15\s*(LTR|KG|L|T|TIN)\b/i.test(description)) {
            displayUnit = 'TIN';
        } else if (/\b5\s*(LTR|KG|L|CAN)\b/i.test(description)) {
            displayUnit = 'CAN';
        } else if (/\bBOX\b/i.test(description) || description.includes('500ML') || description.includes('500 ML') || description.includes('1LTR') || description.includes('1 LTR')) {
            if (/\bBOX\b/i.test(description) || cleanPid.includes('_box')) {
                displayUnit = 'BOX';
            } else if (/\b(100|200|500)\s*ML\b/i.test(description)) {
                displayUnit = 'PCS';
            } else if (displayUnit === 'LITRE') {
                displayUnit = 'PCS';
            }
        } else if (/\b(100|200|500)\s*ML\b/i.test(description)) {
            displayUnit = 'PCS';
        } else if (displayUnit === 'LITRE') {
            displayUnit = 'PCS';
        }
 
        categoryMap[category].push({
            name: description,
            mrp: product.price,
            qty: data.qty,
            unit: displayUnit,
            rate: avgRate,
            amount: data.qty * avgRate
        });
    });

    const categoryOrder = [
        'VARSHINI GOLD',
        'PANJA DEEPA OIL',
        'CASTOR OIL',
        'GROUNDNUT OIL',
        'COCONUT OIL',
        'GINGELLY OIL',
        'PALM OIL',
        "LTR&NO'S",
        'OIL CAKE',
        'BURFI',
        'OTHER'
    ];
    const groups: CategoryGroup[] = [];

    categoryOrder.forEach(catName => {
        const items = categoryMap[catName];
        if (!items || items.length === 0) return;
        const totalAmount = items.reduce((s, it) => s + it.amount, 0);
        const totalQty = items.reduce((s, it) => s + it.qty, 0);
        const primaryUnit = items[0]?.unit || 'NOS';
        groups.push({ categoryName: catName, items, totalQty, totalUnit: primaryUnit, totalAmount });
    });

    const shopLines: ShopLine[] = sortedBills.map((bill, i) => {
        const total = getCartItems(bill.cart, bill.custom_rates).reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return {
            sno: i + 1,
            invoiceNo: bill.invoice_no,
            partyName: `${bill.shop_name}-${(bill.specific_area || bill.area_name || bill.village_name)}`.toUpperCase(),
            amount: total
        };
    });

    const grandTotal = shopLines.reduce((s, l) => s + l.amount, 0);
    
    // Formatting India Standard Time Date
    let displayDate = '';
    try {
        const dateObj = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T00:00:00');
        displayDate = dateObj.toLocaleDateString('en-IN', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric',
            timeZone: 'Asia/Kolkata' 
        }).split(' ').join('-');
    } catch (e) {
        displayDate = dateStr;
    }

    const B = 'border-bottom:1px solid #000;padding:6px 4px;';
    const BH = 'border-bottom:1px solid #000;font-weight:bold;font-size:13px;padding:8px 4px;';

    let productRows = '';
    groups.forEach(g => {
        if (isPlayer) {
            productRows += `<tr><td colspan="3" class="category-header">${g.categoryName}</td></tr>`;
        } else {
            productRows += `<tr><td colspan="6" style="padding:10px 4px 6px 4px;font-weight:bold;font-size:13px;text-transform:uppercase">${g.categoryName}</td></tr>`;
        }

        g.items.forEach((it, i) => {
            const fmtQty = Number.isInteger(it.qty) ? it.qty.toString() : it.qty.toFixed(2);
            if (isPlayer) {
                productRows += `<tr>
                    <td style="border-bottom:1px solid #E2E8F0;padding:12px 8px;text-align:center;font-size:13px;width:40px">${i + 1}</td>
                    <td style="border-bottom:1px solid #E2E8F0;padding:12px 8px;font-size:13px">${it.name}</td>
                    <td style="border-bottom:1px solid #E2E8F0;padding:12px 8px;text-align:right;font-size:13px;width:120px">${fmtQty} ${it.unit}</td>
                </tr>`;
            } else {
                productRows += `<tr>
                    <td style="${B}text-align:center;font-size:13px;font-weight:bold;width:30px">${i + 1}</td>
                    <td style="${B}font-size:13px;font-weight:bold;width:280px">${it.name}</td>
                    <td style="${B}text-align:right;font-size:13px;font-weight:bold;width:100px">${fmtQty} ${it.unit}</td>
                    <td style="${B}text-align:right;font-size:13px;font-weight:bold;width:80px">${it.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style="${B}text-align:right;font-size:13px;font-weight:bold;width:100px">${it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style="${B}text-align:right;font-size:13px;font-weight:bold;width:60px">${it.mrp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>`;
            }
        });

        if (isPlayer) {
            productRows += `<tr class="total-row">
                <td colspan="2" style="text-align:right;font-weight:bold;font-size:13px;padding:12px 8px;background-color:#F8FAFC;border-top:1px solid #94A3B8;border-bottom:2px solid #0F172A">Total Qty :</td>
                <td style="text-align:right;font-weight:bold;font-size:13px;padding:12px 8px;background-color:#F8FAFC;border-top:1px solid #94A3B8;border-bottom:2px solid #0F172A">${g.totalQty} ${g.totalUnit}</td>
            </tr>`;
        } else {
            productRows += `<tr>
                <td colspan="4" style="text-align:right;font-weight:bold;font-size:13px;padding:6px 0">Total :</td>
                <td style="text-align:right;font-weight:bold;font-size:13px;padding:6px 4px">${g.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style="padding:6px 4px"></td>
            </tr>`;
        }
    });

    if (isPlayer) {
        return `<html><head><title>Loading Sheet – ${displayDate}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                padding: 16px;
                color: #1E293B;
                background: #fff;
            }
            h2 {
                font-size: 20px;
                font-weight: 800;
                color: #0F172A;
                text-align: center;
                margin-bottom: 12px;
                font-style: italic;
            }
            .meta-table {
                width: 100%;
                margin-bottom: 16px;
                border-bottom: 2px solid #E2E8F0;
                padding-bottom: 12px;
                border-collapse: collapse;
            }
            .meta-table td {
                font-size: 13px;
                color: #64748B;
                padding: 4px 0;
            }
            .loading-table {
                width: 100%;
                border-collapse: collapse;
            }
            .category-header {
                font-size: 13px;
                font-weight: 800;
                color: #2563EB;
                padding: 16px 8px 8px 8px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                background-color: #F8FAFC;
                border-bottom: 1px solid #E2E8F0;
            }
            .loading-table th {
                font-size: 11px;
                font-weight: 800;
                color: #475569;
                text-transform: uppercase;
                border-bottom: 2px solid #CBD5E1;
                padding: 10px 8px;
            }
        </style></head><body>
        <h2>New Loading Sheet</h2>
        <table class="meta-table">
            <tr>
                <td style="font-weight:bold;color:#0F172A">Stock Group: Primary<br>Vehicle No: <span style="text-transform:uppercase">${vehicleNo || '-'}</span></td>
                <td style="text-align:right;font-weight:bold;color:#0F172A;vertical-align:top">For ${displayDate}</td>
            </tr>
        </table>

        <table class="loading-table">
            <thead>
                <tr>
                    <th style="text-align:center;width:40px">S.No</th>
                    <th style="text-align:left">Particulars</th>
                    <th style="text-align:right;width:120px">Quantity</th>
                </tr>
            </thead>
            <tbody>${productRows}</tbody>
        </table>
        </body></html>`;
    }

    let shopRows = '';
    shopLines.forEach(sl => {
        shopRows += `<tr>
            <td style="${B}text-align:center;font-size:13px;font-weight:bold">${sl.sno}</td>
            <td style="${B}text-align:center;font-size:13px;font-weight:bold">${sl.invoiceNo}</td>
            <td style="${B}font-size:13px;font-weight:bold">${sl.partyName}</td>
            <td style="${B}text-align:right;font-size:13px;font-weight:bold">${sl.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="${B}font-size:13px;font-weight:bold"></td>
            <td style="${B}font-size:13px;font-weight:bold"></td>
        </tr>`;
    });

    return `<html><head><title>Loading Sheet – ${displayDate}</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Courier New',monospace;padding:20px;color:#000;background:#fff}
        table{width:100%;border-collapse:collapse}
        @page{size:A4 portrait;margin:8mm}
        @media print{body{padding:5px}}
    </style></head><body>
    <h2 style="text-align:center;font-size:18px;margin-bottom:2px">New Loading Sheet</h2>
    <table style="margin-bottom:4px">
        <tr>
            <td style="font-size:13px;font-weight:bold">Stock Group : Primary<br>Vehicle No: <span style="text-transform:uppercase">${vehicleNo || '-'}</span></td>
            <td style="font-size:13px;text-align:center">Period :</td>
            <td style="font-size:13px;text-align:right;font-weight:bold">For ${displayDate}</td>
        </tr>
    </table>

    <!-- Product-wise Summary -->
    <table>
        <thead>
            <tr>
                <th style="${BH}text-align:center;width:30px">S.No</th>
                <th style="${BH}">Particulars</th>
                <th style="${BH}text-align:right">Quantity</th>
                <th style="${BH}text-align:right">Rate</th>
                <th style="${BH}text-align:right">Amount</th>
                <th style="${BH}text-align:right">MRP</th>
            </tr>
        </thead>
        <tbody>${productRows}</tbody>
    </table>

    <div style="height:20px"></div>

    <!-- Shop-wise Summary -->
    <table>
        <thead>
            <tr>
                <th style="${BH}text-align:center;width:30px">S.No</th>
                <th style="${BH}text-align:center">Vch No</th>
                <th style="${BH}">Party Name</th>
                <th style="${BH}text-align:right">Amount</th>
                <th style="${BH}text-align:right">Amount Collected</th>
                <th style="${BH}text-align:right">Credit/Return</th>
            </tr>
        </thead>
        <tbody>${shopRows}</tbody>
    </table>

    <div style="height:10px"></div>
    <table>
        <tr>
            <td style="font-size:13px;font-weight:bold;padding:4px 0">Total Sales Value :</td>
            <td style="font-size:16px;font-weight:bold;text-align:right;padding:4px 0;border-top:2px solid #000;border-bottom:1px solid #000">
                ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
        </tr>
        <tr>
            <td style="font-size:13px;font-weight:bold;padding:4px 0">Net Total :</td>
            <td style="font-size:16px;font-weight:bold;text-align:right;padding:4px 0;border-bottom:2px solid #000">
                ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
        </tr>
    </table>
    </body></html>`;
}
