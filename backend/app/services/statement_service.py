import io
import csv
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from backend.app.models import Account, Customer
from backend.app.models.transaction import LedgerEntry

def generate_csv_statement(
    account: Account,
    customer: Optional[Customer],
    entries: List[LedgerEntry]
) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    # Metadata header
    cust_name = f"{customer.first_name} {customer.last_name}" if customer else "N/A"
    writer.writerow(["ABMS BANK - ACCOUNT STATEMENT"])
    writer.writerow(["Account Number", account.account_number])
    writer.writerow(["Customer Name", cust_name])
    writer.writerow(["Account Type", account.account_type])
    writer.writerow(["Currency", account.currency])
    writer.writerow(["Current Balance", f"{account.balance:.2f}"])
    writer.writerow(["Generated At", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")])
    writer.writerow([])

    # Table columns
    writer.writerow(["Date", "Ref", "Description", "Debit", "Credit", "Balance"])

    for entry in entries:
        dt = entry.posted_at.strftime("%Y-%m-%d %H:%M:%S")
        ref = entry.transaction.reference_no if entry.transaction else ""
        desc = entry.transaction.description or entry.transaction.transaction_type if entry.transaction else ""
        debit = f"{entry.amount:.2f}" if entry.entry_type == "DEBIT" else ""
        credit = f"{entry.amount:.2f}" if entry.entry_type == "CREDIT" else ""
        bal = f"{entry.balance_after:.2f}"
        writer.writerow([dt, ref, desc, debit, credit, bal])

    return output.getvalue()


def generate_pdf_statement(
    account: Account,
    customer: Optional[Customer],
    entries: List[LedgerEntry],
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#134e4a')
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748b')
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1e293b')
    )
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#0f172a')
    )
    table_head_style = ParagraphStyle(
        'TableHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    story = []

    # Title & Subtitle
    story.append(Paragraph("ABMS Bank &bull; Official Account Statement", title_style))
    story.append(Paragraph("Enterprise Banking Engine &bull; Double-Entry Cryptographic Ledger", subtitle_style))
    story.append(Spacer(1, 14))

    # Account Summary Block
    cust_name = f"{customer.first_name} {customer.last_name}" if customer else "Authorized Holder"
    period_str = f"{from_date.strftime('%Y-%m-%d') if from_date else 'Inception'} to {to_date.strftime('%Y-%m-%d') if to_date else 'Present'}"

    info_data = [
        [
            Paragraph(f"<b>Account Holder:</b> {cust_name}", meta_style),
            Paragraph(f"<b>Account Number:</b> {account.account_number}", meta_style)
        ],
        [
            Paragraph(f"<b>Account Type:</b> {account.account_type}", meta_style),
            Paragraph(f"<b>Current Balance:</b> ₹{account.balance:,.2f} {account.currency}", meta_style)
        ],
        [
            Paragraph(f"<b>Statement Period:</b> {period_str}", meta_style),
            Paragraph(f"<b>Generated:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}", meta_style)
        ]
    ]
    info_table = Table(info_data, colWidths=[270, 270])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#f1f5f9')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 16))

    # Transactions Table
    table_data = [[
        Paragraph("Date", table_head_style),
        Paragraph("Reference", table_head_style),
        Paragraph("Description", table_head_style),
        Paragraph("Debit (₹)", table_head_style),
        Paragraph("Credit (₹)", table_head_style),
        Paragraph("Balance (₹)", table_head_style),
    ]]

    for entry in entries:
        dt = entry.posted_at.strftime("%Y-%m-%d %H:%M")
        ref = entry.transaction.reference_no if entry.transaction else "-"
        desc = entry.transaction.description or entry.transaction.transaction_type if entry.transaction else "-"
        debit = f"₹{entry.amount:,.2f}" if entry.entry_type == "DEBIT" else "-"
        credit = f"₹{entry.amount:,.2f}" if entry.entry_type == "CREDIT" else "-"
        bal = f"₹{entry.balance_after:,.2f}"

        table_data.append([
            Paragraph(dt, table_cell_style),
            Paragraph(ref, table_cell_style),
            Paragraph(desc[:26], table_cell_style),
            Paragraph(debit, table_cell_style),
            Paragraph(credit, table_cell_style),
            Paragraph(bal, table_cell_style),
        ])

    if len(entries) == 0:
        table_data.append([
            Paragraph("No transactions recorded in this period.", table_cell_style),
            Paragraph("", table_cell_style),
            Paragraph("", table_cell_style),
            Paragraph("", table_cell_style),
            Paragraph("", table_cell_style),
            Paragraph(f"₹{account.balance:,.2f}", table_cell_style),
        ])

    tx_table = Table(table_data, colWidths=[85, 90, 140, 75, 75, 75])
    tx_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#134e4a')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
    ]))
    story.append(tx_table)

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
