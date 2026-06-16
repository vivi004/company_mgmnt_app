const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getModeText = (cash: number, upi: number, cheque: number, discount: number) => {
    const list: string[] = [];
    if (cash > 0) list.push(`Cash: ₹${fmt(cash)}`);
    if (upi > 0) list.push(`UPI: ₹${fmt(upi)}`);
    if (cheque > 0) list.push(`Cheque: ₹${fmt(cheque)}`);
    if (discount > 0) list.push(`Discount: ₹${fmt(discount)}`);
    return list.length > 0 ? list.join(' | ') : '—';
};

const getModeTextCSV = (cash: number, upi: number, cheque: number, discount: number) => {
    const list: string[] = [];
    if (cash > 0) list.push(`Cash: ${cash}`);
    if (upi > 0) list.push(`UPI: ${upi}`);
    if (cheque > 0) list.push(`Cheque: ${cheque}`);
    if (discount > 0) list.push(`Discount: ${discount}`);
    return list.length > 0 ? list.join(' | ') : '—';
};

export function generateCollectionReportHTML(
    collections: any[],
    totals: any,
    modeBreakdown: any,
    expenses: any[],
    routeName: string,
    selectedDate: string
): string {
    const formattedDate = selectedDate.split('-').reverse().join('-');

    const totalBilled = totals.todaysBillAmount;
    const totalCollected = totals.amountCollected;
    const totalReturns = totals.totalReturnAmount;
    const totalUpcoming = totals.totalFutureBills;
    const totalDiscounts = modeBreakdown.discount;
    const totalManualAdjust = totals.totalManualAdjust;
    const totalPending = totals.todaysBillBalance;
    const totalShops = collections.length;

    return `
    <html>
    <head>
        <title>Today Collection Report - ${routeName} - ${formattedDate}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Outfit', 'Inter', sans-serif; padding: 25px; color: #1e293b; background: #fff; line-height: 1.3; }
            
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 20px; }
            .logo-section h1 { font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.05em; }
            .logo-section p { font-size: 10px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 2px; }
            .meta-section { text-align: right; }
            .meta-section h2 { font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; }
            .meta-section p { font-size: 11px; font-weight: 700; color: #64748b; margin-top: 4px; }
            
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 25px; }
            .stat-card { border: 1px solid #e2e8f0; padding: 10px; border-radius: 12px; background: #f8fafc; }
            .stat-card h4 { font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
            .stat-card p { font-size: 16px; font-weight: 900; color: #0f172a; }
            
            h3.section-title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: #0f172a; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; border-left: 4px solid #2563eb; padding-left: 8px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            th, td { padding: 8px 10px; text-align: left; font-size: 10px; border-bottom: 1px solid #e2e8f0; }
            th { background: #0f172a; color: #fff; font-weight: 800; text-transform: uppercase; font-size: 8px; letter-spacing: 0.05em; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .font-black { font-weight: 900; }
            
            tr.total-row { background: #f1f5f9; border-top: 2px solid #cbd5e1; }
            tr.total-row td { font-weight: 900; font-size: 10.5px; color: #0f172a; }
            
            .breakdown-grid { display: grid; grid-template-columns: 1.8fr 1.2fr; gap: 20px; }
            .expense-list { border: 1px solid #e2e8f0; padding: 12px; border-radius: 12px; background: #f8fafc; }
            .expense-item { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 10px; }
            .expense-item:last-child { border-bottom: none; }
            .badge-text { font-size: 8px; color: #64748b; margin-top: 2px; display: block; font-style: italic; font-weight: 500; }
            
            @media print {
                body { padding: 0; }
                @page { size: A4 landscape; margin: 8mm; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo-section">
                <h1>NISHA OIL MILL</h1>
                <p>Daily billing & payment summary</p>
            </div>
            <div class="meta-section">
                <h2>Route: ${routeName}</h2>
                <p>Date: ${formattedDate}</p>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <h4>Billed Today</h4>
                <p>₹${fmt(totalBilled)}</p>
            </div>
            <div class="stat-card">
                <h4>Collected</h4>
                <p>₹${fmt(totalCollected)}</p>
            </div>
            <div class="stat-card">
                <h4>Returns</h4>
                <p>₹${fmt(totalReturns)}</p>
            </div>
            <div class="stat-card">
                <h4>Upcoming Bills</h4>
                <p>₹${fmt(totalUpcoming)}</p>
            </div>
            <div class="stat-card">
                <h4>Discounts</h4>
                <p>₹${fmt(totalDiscounts)}</p>
            </div>
            <div class="stat-card">
                <h4>Manual Adj</h4>
                <p>₹${fmt(totalManualAdjust)}</p>
            </div>
            <div class="stat-card">
                <h4>Pending Balance</h4>
                <p>₹${fmt(totalPending)}</p>
            </div>
            <div class="stat-card">
                <h4>Total Shops</h4>
                <p>${totalShops}</p>
            </div>
        </div>

        <h3 class="section-title">📋 Collection Details</h3>
        <table>
            <thead>
                <tr>
                    <th style="width: 4%;">#</th>
                    <th style="width: 22%;">Shop Name</th>
                    <th class="text-right" style="width: 10%;">Prev Bal</th>
                    <th class="text-right" style="width: 10%;">Today's Bill</th>
                    <th class="text-right" style="width: 9%;">Returns</th>
                    <th class="text-right" style="width: 16%;">Collected</th>
                    <th class="text-right" style="width: 13%;">Manual Adjust</th>
                    <th class="text-right" style="width: 8%;">Upcoming</th>
                    <th class="text-right" style="width: 8%;">Total Bal</th>
                </tr>
            </thead>
            <tbody>
                ${collections.map((row, idx) => {
                    const collected = row.cash_collected + row.upi_collected + row.cheque_collected + (row.discount_payment || 0);
                    const collectedBreakdown = getModeText(row.cash_collected, row.upi_collected, row.cheque_collected, row.discount_payment);
                    const adjustedBreakdown = getModeText(row.manual_cash, row.manual_upi, row.manual_cheque, row.discount_adjustment);
                    
                    return `
                    <tr>
                        <td>${idx + 1}</td>
                        <td class="font-bold">
                            ${row.shop_name} ${row.owner_name && row.owner_name.trim() ? `(${row.owner_name.trim()})` : ''}
                        </td>
                        <td class="text-right">₹${fmt(row.old_balance)}</td>
                        <td class="text-right">₹${fmt(row.todays_bill_amount)}</td>
                        <td class="text-right" style="color: #d97706; font-weight: 700;">₹${fmt(row.return_amount || 0)}</td>
                        <td class="text-right">
                            <span class="font-bold" style="color: #16a34a;">₹${fmt(collected)}</span>
                            ${collected > 0 ? `<span class="badge-text">${collectedBreakdown}</span>` : ''}
                        </td>
                        <td class="text-right">
                            <span>₹${fmt(row.manual_adjustments + (row.discount_payment || 0))}</span>
                            ${(row.manual_adjustments + (row.discount_payment || 0)) !== 0 ? `<span class="badge-text">${adjustedBreakdown}</span>` : ''}
                        </td>
                        <td class="text-right" style="color: #8b5cf6; font-weight: 700;">${row.future_bills !== 0 ? `₹${fmt(row.future_bills)}` : '—'}</td>
                        <td class="text-right font-black" style="color: ${row.total_balance > 0 ? '#ef4444' : '#16a34a'};">
                            ₹${fmt(row.total_balance)}
                        </td>
                    </tr>`;
                }).join('')}
                <tr class="total-row">
                    <td></td>
                    <td>TOTAL</td>
                    <td class="text-right">₹${fmt(totals.totalOldBalance)}</td>
                    <td class="text-right">₹${fmt(totals.todaysBillAmount)}</td>
                    <td class="text-right" style="color: #d97706;">₹${fmt(totals.totalReturnAmount)}</td>
                    <td class="text-right" style="color: #16a34a;">₹${fmt(totals.amountCollected)}</td>
                    <td class="text-right">₹${fmt(totals.totalManualAdjust)}</td>
                    <td class="text-right" style="color: #8b5cf6;">₹${fmt(totals.totalFutureBills)}</td>
                    <td class="text-right font-black" style="color: ${totals.totalBalance > 0 ? '#ef4444' : '#16a34a'};">
                        ₹${fmt(totals.totalBalance)}
                    </td>
                </tr>
            </tbody>
        </table>

        <div class="breakdown-grid">
            <div>
                <h3 class="section-title">💰 Collection Breakdown by Mode</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Payment Mode / Detail</th>
                            <th class="text-right" style="width: 30%;">Amount</th>
                            <th class="text-right" style="width: 25%;">% Share</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="font-bold">💵 Cash (Net)</td>
                            <td class="text-right font-bold">₹${fmt(modeBreakdown.netCash)}</td>
                            <td class="text-right">${modeBreakdown.cashPercent}%</td>
                        </tr>
                        <tr>
                            <td class="font-bold">📱 UPI</td>
                            <td class="text-right font-bold">₹${fmt(modeBreakdown.upi)}</td>
                            <td class="text-right">${modeBreakdown.upiPercent}%</td>
                        </tr>
                        <tr>
                            <td class="font-bold">📝 Cheque</td>
                            <td class="text-right font-bold">₹${fmt(modeBreakdown.cheque)}</td>
                            <td class="text-right">${modeBreakdown.chequePercent}%</td>
                        </tr>
                        <tr class="total-row">
                            <td>TOTAL INCOME</td>
                            <td class="text-right">₹${fmt(modeBreakdown.total)}</td>
                            <td class="text-right">100%</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div>
                <h3 class="section-title">🥪 Expenses recorded (₹${fmt(modeBreakdown.totalExpenses)})</h3>
                <div class="expense-list">
                    ${expenses.length === 0 
                        ? '<p style="font-size: 10px; color: #64748b; font-style: italic; text-align: center; padding: 10px 0;">No expenses recorded today.</p>' 
                        : expenses.map(e => `
                            <div class="expense-item">
                                <span style="font-weight: 700; color: #475569;">${e.description}</span>
                                <span style="font-weight: 800; color: #0f172a;">₹${fmt(e.amount)}</span>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        </div>
    </body>
    </html>`;
}

export function generateCollectionReportCSV(
    collections: any[],
    totals: any,
    modeBreakdown: any,
    expenses: any[],
    routeName: string,
    selectedDate: string
): string {
    const formattedDate = selectedDate.split('-').reverse().join('-');
    const csvRows: string[] = [];

    csvRows.push(`"NISHA OIL MILL — DAILY COLLECTION REPORT"`);
    csvRows.push(`"Route:","${routeName}"`);
    csvRows.push(`"Date:","${formattedDate}"`);
    csvRows.push(``);

    csvRows.push(`"SUMMARY STATISTICS"`);
    csvRows.push(`"Billed Today","₹${fmt(totals.todaysBillAmount)}"` );
    csvRows.push(`"Collected","₹${fmt(totals.amountCollected)}"` );
    csvRows.push(`"Returns","₹${fmt(totals.totalReturnAmount)}"` );
    csvRows.push(`"Upcoming Bills","₹${fmt(totals.totalFutureBills)}"` );
    csvRows.push(`"Discounts","₹${fmt(modeBreakdown.discount)}"` );
    csvRows.push(`"Manual Adj","₹${fmt(totals.totalManualAdjust)}"` );
    csvRows.push(`"Pending Balance","₹${fmt(totals.todaysBillBalance)}"` );
    csvRows.push(`"Total Shops","${collections.length}"` );
    csvRows.push(``);

    csvRows.push(`"SHOP COLLECTIONS"`);
    csvRows.push([
        '"#"', '"Shop Name"', '"Prev Bal (₹)"', '"Today\'s Bill (₹)"', '"Returns (₹)"', 
        '"Collected (₹)"', '"Collected Mode Breakdown"', '"Manual Adjust (₹)"', '"Adjust Mode Breakdown"', 
        '"Upcoming (₹)"', '"Total Bal (₹)"'
    ].join(','));

    collections.forEach((row, idx) => {
        const collected = row.cash_collected + row.upi_collected + row.cheque_collected + (row.discount_payment || 0);
        const collectedBreakdown = getModeTextCSV(row.cash_collected, row.upi_collected, row.cheque_collected, row.discount_payment);
        const adjustedBreakdown = getModeTextCSV(row.manual_cash, row.manual_upi, row.manual_cheque, row.discount_adjustment);
        
        const shopNameWithOwner = `${row.shop_name} ${row.owner_name && row.owner_name.trim() ? `(${row.owner_name.trim()})` : ''}`;

        csvRows.push([
            idx + 1,
            `"${shopNameWithOwner.replace(/"/g, '""')}"`,
            row.old_balance.toFixed(2),
            row.todays_bill_amount.toFixed(2),
            row.return_amount.toFixed(2),
            collected.toFixed(2),
            `"${collectedBreakdown}"`,
            (row.manual_adjustments + (row.discount_payment || 0)).toFixed(2),
            `"${adjustedBreakdown}"`,
            row.future_bills.toFixed(2),
            row.total_balance.toFixed(2)
        ].join(','));
    });

    csvRows.push([
        '""',
        '"TOTAL"',
        totals.totalOldBalance.toFixed(2),
        totals.todaysBillAmount.toFixed(2),
        totals.totalReturnAmount.toFixed(2),
        totals.amountCollected.toFixed(2),
        '""',
        totals.totalManualAdjust.toFixed(2),
        '""',
        totals.totalFutureBills.toFixed(2),
        totals.totalBalance.toFixed(2)
    ].join(','));
    csvRows.push(``);

    csvRows.push(`"COLLECTION BREAKDOWN BY MODE"`);
    csvRows.push(`"Mode","Amount (₹)","Share (%)"`);
    csvRows.push(`"Cash (Net)","${modeBreakdown.netCash.toFixed(2)}","${modeBreakdown.cashPercent}%"`);
    csvRows.push(`"UPI","${modeBreakdown.upi.toFixed(2)}","${modeBreakdown.upiPercent}%"`);
    csvRows.push(`"Cheque","${modeBreakdown.cheque.toFixed(2)}","${modeBreakdown.chequePercent}%"`);
    csvRows.push(`"TOTAL INCOME","${modeBreakdown.total.toFixed(2)}","100%"`);
    csvRows.push(``);

    csvRows.push(`"RECORDED EXPENSES (Total: ₹${modeBreakdown.totalExpenses.toFixed(2)})"`);
    csvRows.push(`"Description","Amount (₹)"`);
    if (expenses.length === 0) {
        csvRows.push(`"No expenses recorded","0.00"`);
    } else {
        expenses.forEach(e => {
            csvRows.push(`"${e.description.replace(/"/g, '""')}","${e.amount.toFixed(2)}"`);
        });
    }

    return csvRows.join('\n');
}
