{{-- Shared black & white print styles for every PDF (dompdf 2.x: tables only, no flex/grid). --}}
<style>
    @page {
        size: A4 portrait;
        margin: 16mm 16mm 22mm 16mm;
    }

    * {
        font-family: "DejaVu Sans", Arial, Helvetica, sans-serif;
    }

    body {
        margin: 0;
        font-size: 9.5px;
        line-height: 1.45;
        color: #000;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    td, th {
        vertical-align: top;
    }

    .muted { color: #555; }
    .small { font-size: 8.5px; }
    .bold { font-weight: bold; }
    .right { text-align: right; }
    .center { text-align: center; }
    .nowrap { white-space: nowrap; }
    .upper { text-transform: uppercase; }

    /* ---------- fixed footer on every page ---------- */
    .doc-footer {
        position: fixed;
        left: 0;
        right: 0;
        bottom: -14mm;
        height: 10mm;
        border-top: 0.6px solid #000;
        padding-top: 4px;
        font-size: 8px;
        color: #444;
    }

    .doc-footer .page-no:after { /* stamped by pdfWithPageNumbers() */
        content: "";
    }

    /* ---------- document header ---------- */
    .doc-head td { vertical-align: middle; }

    .doc-head .brand { width: 35%; }

    .doc-head .brand img {
        max-height: 62px;
        max-width: 170px;
    }

    .doc-head .company { text-align: right; font-size: 9px; color: #222; }

    .company-name {
        font-size: 15px;
        font-weight: bold;
        color: #000;
        margin-bottom: 2px;
    }

    .rule-heavy { border-top: 2px solid #000; margin: 10px 0 0; }
    .rule-light { border-top: 0.6px solid #000; margin: 0; }

    .title-row { margin-top: 12px; }
    .title-row td { vertical-align: top; }

    .doc-title {
        font-size: 22px;
        font-weight: bold;
        letter-spacing: 2px;
        color: #000;
    }

    .doc-subtitle { font-size: 10px; color: #444; margin-top: 2px; }

    .meta-box {
        width: 44%;
    }

    .meta-box table td {
        padding: 2px 0 2px 8px;
        font-size: 9px;
    }

    .meta-box .k { color: #555; text-align: right; width: 48%; }
    .meta-box .v { font-weight: bold; text-align: right; }

    .stamp {
        display: inline-block;
        border: 1.2px solid #000;
        padding: 2px 8px;
        font-size: 9px;
        font-weight: bold;
        letter-spacing: 1px;
        text-transform: uppercase;
    }

    /* ---------- party / info boxes ---------- */
    .parties { margin-top: 14px; }
    .parties > tbody > tr > td { width: 50%; }
    .parties > tbody > tr > td.gap { width: 4%; }

    .box { border: 0.6px solid #8a8a8a; }

    .box-title {
        background: #e6e6e6;
        border-bottom: 0.6px solid #8a8a8a;
        padding: 4px 8px;
        font-size: 8px;
        font-weight: bold;
        letter-spacing: 1px;
        text-transform: uppercase;
    }

    .box-body { padding: 6px 8px; font-size: 9px; min-height: 52px; }
    .box-body .name { font-size: 11px; font-weight: bold; margin-bottom: 2px; }

    .kv td { padding: 1px 0; font-size: 9px; }
    .kv .k { color: #555; width: 40%; }
    .kv .v { font-weight: bold; }

    /* ---------- line items ---------- */
    .items { margin-top: 14px; }

    .items thead th {
        background: #e6e6e6;
        border-top: 1.2px solid #000;
        border-bottom: 1.2px solid #000;
        padding: 6px 6px;
        font-size: 8px;
        font-weight: bold;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        text-align: left;
    }

    .items tbody td {
        padding: 6px 6px;
        border-bottom: 0.4px solid #b5b5b5;
        font-size: 9px;
    }

    .items tbody tr:nth-child(even) td { background: #f5f5f5; }
    .items .num { text-align: right; white-space: nowrap; }
    .items .idx { width: 4%; color: #555; }
    .items .code { font-size: 8px; color: #555; }

    .items tfoot td {
        padding: 6px 6px;
        border-top: 1.2px solid #000;
        border-bottom: 1.2px solid #000;
        font-weight: bold;
        font-size: 9px;
    }

    .items .empty { text-align: center; color: #555; padding: 14px; }

    /* ---------- totals ---------- */
    .summary { margin-top: 12px; }
    .summary > tbody > tr > td { vertical-align: top; }

    .totals td { padding: 4px 6px; font-size: 9.5px; }
    .totals .k { color: #333; }
    .totals .v { text-align: right; white-space: nowrap; }
    .totals .sep td { border-top: 0.6px solid #000; }

    .totals .grand td {
        border-top: 1.5px solid #000;
        border-bottom: 3px double #000;
        font-size: 12px;
        font-weight: bold;
        padding: 6px;
    }

    .words {
        border: 0.6px solid #8a8a8a;
        padding: 6px 8px;
        font-size: 8.5px;
    }

    .words .label {
        font-size: 7.5px;
        font-weight: bold;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: #444;
        margin-bottom: 2px;
    }

    .notes { margin-top: 12px; font-size: 8.5px; }
    .notes .label {
        font-size: 7.5px;
        font-weight: bold;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: #444;
        margin-bottom: 2px;
    }

    /* ---------- signatures ---------- */
    .signatures { margin-top: 34px; }
    .signatures td { width: 30%; padding-top: 26px; text-align: center; font-size: 8.5px; }
    .signatures td.gap { width: 5%; padding: 0; }
    .signatures .line { border-top: 0.8px solid #000; padding-top: 3px; }

    .thanks {
        margin-top: 18px;
        text-align: center;
        font-size: 10px;
        font-weight: bold;
        letter-spacing: 0.5px;
    }

    .page-break { page-break-after: always; }
</style>
