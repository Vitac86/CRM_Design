<#
.SYNOPSIS
    Build-time only: export ONE source Word document to a clean PDF base template.

.DESCRIPTION
    Runs on a developer workstation that has Microsoft Word installed. The
    resulting PDF is committed to static-uikit/assets/document-pdf-templates/,
    so production users need nothing but a browser.

    THIS SCRIPT IS NOT PART OF THE BROWSER RUNTIME. The CRM never invokes Word,
    LibreOffice, a backend converter or any native binary when generating a
    document — it draws onto the committed PDF with pdf-lib.

    The source document is opened READ-ONLY and is never modified.

    One document per invocation, by design: driving several documents from a
    single long-lived Word automation session proved unreliable (Word blocks
    indefinitely inside ExportAsFixedFormat). A fresh Word process per file is
    slower but deterministic. See tools/README.md for the batch loop.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools\docx-to-pdf.ps1 `
        -Src "C:\work\source\accession-application-fl.docx" `
        -Dst "..\assets\document-pdf-templates\accession-application-fl.pdf"
#>
param(
    [Parameter(Mandatory = $true)][string]$Src,
    [Parameter(Mandatory = $true)][string]$Dst
)

$ErrorActionPreference = 'Stop'

$Src = (Resolve-Path -LiteralPath $Src).Path

# Word can block for a long time when ExportAsFixedFormat writes straight to a
# mapped network drive, and this repository is normally checked out on one.
# Export to a local scratch file first, then move the finished PDF into place.
$scratch = Join-Path $env:TEMP ('docx-to-pdf-' + [guid]::NewGuid().ToString('N') + '.pdf')

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
# Without this Word can block on a modal macro-trust prompt and never return.
$word.AutomationSecurity = 3      # msoAutomationSecurityForceDisable

$doc = $null
try {
    # Open(FileName, ConfirmConversions, ReadOnly, AddToRecentFiles)
    # NOTE: pass plain values, not [ref] — [ref] here makes Word hang.
    $doc = $word.Documents.Open($Src, $false, $true, $false)
    $pages = $doc.ComputeStatistics(2)      # wdStatisticPages

    # OutputFileName, ExportFormat(17=PDF), OpenAfterExport, OptimizeFor(0=print),
    # Range(0=all), From, To, Item(0=content only, no markup), IncludeDocProps,
    # KeepIRM, CreateBookmarks(0=none), DocStructureTags, BitmapMissingFonts,
    # UseISO19005_1(PDF/A off).
    $doc.ExportAsFixedFormat($scratch, 17, $false, 0, 0, 1, 1, 0, $true, $true, 0, $true, $true, $false)

    $doc.Close($false)
    $doc = $null

    $outDir = Split-Path -Parent $Dst
    if ($outDir -and -not (Test-Path $outDir)) {
        New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    }
    Move-Item -LiteralPath $scratch -Destination $Dst -Force

    Write-Host ("OK  {0}  ({1} page(s))" -f (Split-Path -Leaf $Dst), $pages)
}
finally {
    if ($doc) { $doc.Close($false) }
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    Remove-Item -LiteralPath $scratch -Force -ErrorAction SilentlyContinue
}
