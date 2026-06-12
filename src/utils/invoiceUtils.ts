import { getCartItems, Product } from '../services/productService';
import { formatIST } from './dateUtils';
import * as qrcodeModule from 'qrcode-generator';

const generateQRCodeDataURL = (text: string): string => {
    try {
        let qrFn: any = qrcodeModule;
        if (qrFn && typeof qrFn.qrcode === 'function') {
            qrFn = qrFn.qrcode;
        } else if (typeof qrFn !== 'function' && qrFn && typeof qrFn.default === 'function') {
            qrFn = qrFn.default;
        }
        if (typeof qrFn !== 'function' && typeof window !== 'undefined' && (window as any).qrcode) {
            qrFn = (window as any).qrcode;
        }
        if (typeof qrFn !== 'function') {
            throw new Error('qrcode function is not defined in any of the resolved formats');
        }
        const qr = qrFn(0, 'M');
        qr.addData(text);
        qr.make();
        return qr.createDataURL(4, 1);
    } catch (e) {
        console.error('Error generating QR code', e);
        return '';
    }
};

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertGroup(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertGroup(n % 100) : '');
}

export function numberToWordsINR(amount: number): string {
    if (amount === 0) return 'INR Zero Only';
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);

    let result = '';
    if (rupees >= 10000000) {
        result += convertGroup(Math.floor(rupees / 10000000)) + ' Crore ';
    }
    const rem1 = rupees % 10000000;
    if (rem1 >= 100000) {
        result += convertGroup(Math.floor(rem1 / 100000)) + ' Lakh ';
    }
    const rem2 = rem1 % 100000;
    if (rem2 >= 1000) {
        result += convertGroup(Math.floor(rem2 / 1000)) + ' Thousand ';
    }
    const rem3 = rem2 % 1000;
    if (rem3 > 0) {
        result += convertGroup(rem3);
    }

    result = 'INR ' + result.trim();
    if (paise > 0) {
        result += ' and ' + convertGroup(paise) + ' Paise';
    }
    return result + ' Only';
}

export interface InvoiceData {
    shopName: string;
    villageName: string;
    areaName?: string;
    specificArea?: string;
    cart: Record<string, number>;
    customRates?: Record<string, number>;
    invoiceNo: number;
    date: string;
    deliveryDate?: string;
    phone?: string;
    phone2?: string;
    upiId1?: string;
    upiName1?: string;
    upiId2?: string;
    upiName2?: string;
}

export const generateInvoiceHTML = (data: InvoiceData, vehicleNo: string = '') => {
    const upiId1 = data.upiId1 || 'nishaoilmills@ybl';
    const upiName1 = data.upiName1 || 'NISHA OIL MILL';
    const upiId2 = data.upiId2 || 'nishaoilmills@okaxis';
    const upiName2 = data.upiName2 || 'NISHA OIL MILL';

    const upiLink1 = `upi://pay?pa=${upiId1}&pn=${encodeURIComponent(upiName1)}&cu=INR`;
    const upiLink2 = `upi://pay?pa=${upiId2}&pn=${encodeURIComponent(upiName2)}&cu=INR`;
    const items = getCartItems(data.cart, data.customRates).map(it => {
        const isLtrVariant = it.id.endsWith('_ltr');
        const sizeLower = it.size.toLowerCase();
        const is100ml = sizeLower === '100 ml';
        const is200ml = sizeLower === '200 ml';
        const is500ml = sizeLower === '500 ml';
        if (isLtrVariant && (is100ml || is200ml || is500ml)) {
            const multiplier = is100ml ? 10 : is200ml ? 5 : is500ml ? 2 : 1;
            return {
                ...it,
                quantity: it.quantity / multiplier,
                price: it.price * multiplier,
                unit: 'LTR'
            };
        }
        return it;
    });
    const totalQty = items.reduce((a, i) => a + i.quantity, 0);
    const totalAmt = items.reduce((a, i) => a + i.price * i.quantity, 0);
    const ds = formatIST(data.date, { hour: undefined, minute: undefined, second: undefined, hour12: false });
    const dd = data.deliveryDate || data.date;
    const dds = formatIST(dd, { hour: undefined, minute: undefined, second: undefined, hour12: false });

    const B = 'border:1px solid #000;padding:3px 5px;vertical-align:top;';
    const LR = 'border-left:1px solid #000;border-right:1px solid #000;border-top:none;border-bottom:none;padding:3px 5px;vertical-align:top;';
    const LRB = 'border-left:1px solid #000;border-right:1px solid #000;border-top:none;border-bottom:1px solid #000;padding:3px 5px;vertical-align:top;';

    const itemRows = items.map((it, i) => {
        let description = `${it.name.toUpperCase()} ${it.size.toUpperCase()}`;
        if (it.id === 'vs-gn-500ml-box' || it.id === 'vs-gn-1l-box') {
            description = description.replace(/\s*BOX$/i, '');
        }

        // Renames Box sizes strictly for the Invoice layout
        description = description.replace('1 BOX (50X100ML)', '100ML BOX');
        description = description.replace('1 BOX (25X200ML)', '200ML BOX');
        description = description.replace('1 BOX (20X500ML)', '500ML BOX');
        description = description.replace('1 BOX (10X1L)', '1LTR BOX');
        description = description.replace('1 BOX (5X2L)', '2LTR BOX');
        description = description.replace('1 LTR (10X100ML)', '100ML');
        description = description.replace('1 LTR (5X200ML)', '200ML');
        let u = (it.unit || 'NOS').toUpperCase();

        if (it.id === 'vs-gn-500ml-box' || it.id === 'vs-gn-1l-box' || it.id.endsWith('-box')) {
            u = 'BOX';
        } else if (/\b15\s*(LTR|KG|L|T|TIN)\b/i.test(description)) u = 'TIN';
        else if (/\b5\s*(LTR|KG|L|CAN)\b/i.test(description)) u = 'CAN';
        else if (/\bBOX\b/i.test(description) || it.id.includes('_box')) u = 'BOX';
        else if (it.id.endsWith('_ltr') && (it.size.toLowerCase() === '100 ml' || it.size.toLowerCase() === '200 ml' || it.size.toLowerCase() === '500 ml')) u = 'LTR';
        else if (/\b(100|200|500)\s*ML\b/i.test(description)) u = 'PCS';
        else if (u === 'LITRE') u = 'PCS';

        return `<tr>
    <td style="${LR}text-align:center;">${i + 1}</td>
    <td style="${LR}font-weight:bold;">${description}</td>
    <td style="${LR}text-align:center;font-weight:bold;">${it.quantity} ${u === 'CAN' ? 'CANS' : u}${it.weight ? `<br><span style="font-size:9px;font-style:italic;font-weight:normal;">(${it.weight})</span>` : ''}</td>
    <td style="${LR}text-align:right;">${it.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    <td style="${LR}text-align:center;">${u}</td>
    <td style="${LR}text-align:right;font-weight:bold;">${(it.price * it.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
</tr>`;
    }).join('');

    const page = (label: string) => `
<div class="bp" style="font-family:Arial,sans-serif;font-size:11px;color:#000;background:#fff;padding:6mm 8mm;margin-bottom:10mm;border:1px solid #eee">

<div style="position:relative;text-align:center;margin-bottom:4px;">
    <b style="font-size:14px;text-decoration:underline;">QUOTATION</b>
    <span style="position:absolute;right:0;top:0;font-size:10px;font-style:italic;font-weight:normal;">(${label})</span>
</div>

<table style="width:100%;border-collapse:collapse;table-layout:fixed;">
<colgroup>
    <col style="width:4%"><col style="width:44%">
    <col style="width:13%"><col style="width:13%">
    <col style="width:6%"><col style="width:20%">
</colgroup>
<tbody>

<!-- Row 1: NISHA OIL MILL (rowspan=5) | Invoice No | Dated -->
<tr>
    <td colspan="2" rowspan="5" style="${B}line-height:1.7;vertical-align:top;">
        <b style="font-size:13px;">NISHA OIL MILL</b><br>
        Salem Main Road,Konganapuram,<br>
        Edappadi[Tk],Salem[dt].<br>
        FSSAI NO:12417018000626.<br>
        State Name : Tamil Nadu, Code : 33<br>
        Contact : 9965174472<br>
        E-Mail : nishaoilmills.pvt.ltd@gmail.com
    </td>
    <td colspan="2" style="${B}font-size:10px;">Invoice No.<br><b style="font-size:11px;">${data.invoiceNo}</b></td>
    <td colspan="2" style="${B}font-size:10px;">Dated<br><b style="font-size:11px;">${dds}</b></td>
</tr>
<tr>
    <td colspan="2" style="${B}font-size:10px;">Delivery Note</td>
    <td colspan="2" style="${B}font-size:10px;">Mode/Terms of Payment<br><b>15 Days</b></td>
</tr>
<tr>
    <td colspan="2" style="${B}font-size:10px;">Dispatch Doc No.</td>
    <td colspan="2" style="${B}font-size:10px;">Delivery Note Date<br><b style="font-size:11px;"></b></td>
</tr>
<tr>
    <td colspan="2" style="${B}font-size:10px;">Dispatched through</td>
    <td colspan="2" style="${B}font-size:10px;">Destination</td>
</tr>
<tr>
    <td colspan="2" style="${B}font-size:10px;">Bill of Lading/LR-RR No.</td>
    <td colspan="2" style="${B}font-size:10px;">Motor Vehicle No.<br><b style="font-size:12px;">${vehicleNo.toUpperCase()}</b></td>
</tr>

<!-- Row 6: Buyer (left col1+2) | Terms of Delivery (right col3-6) -->
<tr>
    <td colspan="2" style="${B}line-height:1.7;padding:5px 5px 8px;vertical-align:top;">
        <span style="font-size:9px;">Buyer (Bill to)</span><br>
        <b style="font-size:12px;">${data.shopName.toUpperCase()}</b><br>
        ${(data.specificArea || data.areaName || data.villageName).toUpperCase()}<br>
        ${data.phone || data.phone2 ? `Mobile No: ${data.phone || data.phone2}<br>` : ''}State Name&nbsp;&nbsp;&nbsp;&nbsp;: Tamil Nadu, Code : 33
    </td>
    <td colspan="4" style="${B}font-size:10px;vertical-align:top;">Terms of Delivery<br><b style="font-size:12px;">IMMEDIATE - COD/UPI</b></td>
</tr>

<!-- Column headers -->
<tr style="text-align:center;font-size:10px;">
    <td style="${B}">Sl<br>No.</td>
    <td style="${B}">Description of Goods</td>
    <td style="${B}">Quantity</td>
    <td style="${B}">Rate</td>
    <td style="${B}">per</td>
    <td style="${B}">Amount</td>
</tr>

<!-- Item rows -->
${itemRows}

<!-- Spacer row -->
<tr>
    <td style="${LRB}height:120px;"></td>
    <td style="${LRB}"></td>
    <td style="${LRB}"></td>
    <td style="${LRB}"></td>
    <td style="${LRB}"></td>
    <td style="${LRB}"></td>
</tr>

<!-- Total -->
<tr style="font-weight:bold;">
    <td style="${B}"></td>
    <td style="${B}text-align:right;font-size:14px;">Total</td>
    <td style="${B}text-align:center;font-size:14px;">${totalQty}</td>
    <td style="${B}"></td>
    <td style="${B}"></td>
    <td style="${B}text-align:right;font-size:20px;font-weight:bold;">&#8377; ${totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
</tr>

<!-- Amount + Declaration in ONE full-width cell; E.&O.E floated right (no internal column line) -->
<tr>
    <td colspan="6" style="${B}font-size:9px;padding:4px 5px;vertical-align:top;line-height:1.6;">
        <span style="float:right;font-size:9px;">E. &amp; O.E</span>
        Amount Chargeable (in words)<br>
        <b style="font-size:10px;">${numberToWordsINR(totalAmt)}</b><br>
        <u><b>Declaration</b></u><br>
        We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. TERMS AND CONDITIONS:<br>
        1) Interest @ 24% per month will be charged on overdue bills.<br>
        2) Shortage/damage claims must be reported immediately on receipt.<br>
        3) Cheque /RTGS/NEFT/IMPS should be in the name of NISHA OIL MILL only<br>
        4) Rates are valid only for this invoice; future supplies will be at prevailing rates.
    </td>
</tr>

<!-- Customer's Seal (col1+2) | for NISHA OIL MILL + Authorised Signatory (col3-6) -->
<tr>
    <td colspan="2" style="${B}font-size:9px;padding:5px;vertical-align:top;min-height:60px;">
        Customer's Seal and Signature<br><br><br>
    </td>
    <td colspan="4" style="${B}font-size:10px;text-align:right;vertical-align:top;padding:5px;">
        <b>for NISHA OIL MILL</b>
        <div style="margin-top:40px;font-size:10px;">Authorised Signatory</div>
    </td>
</tr>

</tbody>
</table>

<!-- Footer outside table -->
<div style="text-align:center;font-size:9px;margin-top:6px;line-height:1.8;">
    <b>SUBJECT TO SALEM JURISDICTION</b><br>
    This is a Computer Generated Invoice
    <div style="display: flex; justify-content: center; gap: 250px; margin-top: 8px;">
        <div style="text-align: center;">
            <img src="${generateQRCodeDataURL(upiLink1)}" width="85" height="85" style="display: block; margin: 0 auto 3px;" alt="Scan to Pay 1" />
            <div style="font-size: 8px; font-weight: bold; line-height: 1.2; color: #333;">GPay/PhonePe/Paytm<br>${upiId1}</div>
        </div>
        <div style="text-align: center;">
            <img src="${generateQRCodeDataURL(upiLink2)}" width="85" height="85" style="display: block; margin: 0 auto 3px;" alt="Scan to Pay 2" />
            <div style="font-size: 8px; font-weight: bold; line-height: 1.2; color: #333;">Scan & Pay<br>${upiId2}</div>
        </div>
    </div>
</div>

</div>`;

    return `<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script>
      function captureAsImage() {
        if (typeof html2canvas === 'undefined') {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CAPTURE_ERROR', error: 'Image library still loading, please try again in a second.' }));
          return;
        }
        // Capture only the first invoice container (.bp class)
        const element = document.querySelector('.bp') || document.body;
        html2canvas(element, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff'
        }).then(function(canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CAPTURE_IMAGE', dataUrl: dataUrl }));
        }).catch(function(error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CAPTURE_ERROR', error: error.toString() }));
        });
      }
    </script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: Arial, sans-serif; 
            font-size: 11px; 
            color: #000; 
            background: #fff; 
        }
        @page { 
            size: A4; 
            margin: 8mm; 
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            table-layout: fixed;
        }
        td, th { border: none; }
        div.bp { 
            display: block;
            width: 100%;
            page-break-after: always; 
            break-after: page;
            padding: 2mm 0;
        }
        div.bp:last-child { 
            page-break-after: avoid; 
            break-after: avoid;
        }
    </style>
</head>
<body>
    ${page('ORIGINAL FOR RECIPIENT')}
    ${page('DUPLICATE FOR SUPPLIER')}
</body>
</html>`;
};
