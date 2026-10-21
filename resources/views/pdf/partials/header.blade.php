{{--
    Document header.
    @param string|null $logo     data URI of the company logo
    @param string      $title    e.g. INVOICE
    @param string|null $subtitle optional line under the title
    @param array       $meta     ['Invoice No' => 'SA_1', ...]
    @param string|null $stamp    optional status stamp, e.g. PAID / DRAFT
    @param array|null  $company  ['name','address','phone','email']; defaults to settings
--}}
@php
    $company = $company ?? [
        'name' => getSettingValue('company_name'),
        'address' => getSettingValue('address'),
        'phone' => getSettingValue('phone'),
        'email' => getSettingValue('email'),
    ];
@endphp
<table class="doc-head">
    <tr>
        <td class="brand">
            @if(!empty($logo))
                <img src="{{ $logo }}" alt="">
            @endif
        </td>
        <td class="company">
            <div class="company-name">{{ $company['name'] }}</div>
            @if(!empty($company['address']))<div>{{ $company['address'] }}</div>@endif
            <div>
                @if(!empty($company['phone']))Tel: {{ $company['phone'] }}@endif
                @if(!empty($company['phone']) && !empty($company['email'])) &nbsp;|&nbsp; @endif
                @if(!empty($company['email'])){{ $company['email'] }}@endif
            </div>
        </td>
    </tr>
</table>
<div class="rule-heavy"></div>
<table class="title-row">
    <tr>
        <td>
            <div class="doc-title">{{ $title }}</div>
            @if(!empty($subtitle))<div class="doc-subtitle">{{ $subtitle }}</div>@endif
            @if(!empty($stamp))<div style="margin-top: 6px;"><span class="stamp">{{ $stamp }}</span></div>@endif
        </td>
        <td class="meta-box">
            <table>
                @foreach(($meta ?? []) as $label => $value)
                    <tr>
                        <td class="k">{{ $label }}</td>
                        <td class="v">{{ $value }}</td>
                    </tr>
                @endforeach
            </table>
        </td>
    </tr>
</table>
