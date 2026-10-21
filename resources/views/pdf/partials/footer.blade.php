{{-- Fixed footer, repeated on every page. Must be placed before the page content.
     "Page X of Y" is stamped on the canvas by pdfWithPageNumbers(). --}}
@php
    try {
        $generatedAt = \App\Models\HrSetting::now();
    } catch (\Throwable $e) {
        $generatedAt = now();
    }
@endphp
<div class="doc-footer">
    <table>
        <tr>
            <td class="small">
                {{ $footerNote ?? getSettingValue('company_name') }}
                &nbsp;|&nbsp; Generated {{ $generatedAt->format('d M Y, h:i A') }}
            </td>
            <td class="small right"><span class="page-no"></span></td>
        </tr>
    </table>
</div>
