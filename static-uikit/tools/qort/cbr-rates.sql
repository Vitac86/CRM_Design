WITH requested AS (
    SELECT CAST(? AS int) AS tradeDate, CAST(? AS int) AS asOfDate, CAST(? AS varchar(32)) AS infoSource
), currencies AS (
    SELECT a.ID, CASE WHEN a.ShortName = 'RUR' THEN 'RUB' ELSE a.ShortName END AS code
    FROM dbo.Assets a
    WHERE a.AssetType_Const = 3 AND a.ShortName IN (?,?,?,?)
), dated AS (
    SELECT h.TradeAsset_ID, h.PriceAsset_ID, h.Qty, h.Bid, h.Ask, h.OldDate AS rateDate,
           'CrossRatesHist' AS sourceTable
    FROM dbo.CrossRatesHist h CROSS JOIN requested p
    WHERE h.InfoSource = p.infoSource AND h.OldDate = p.tradeDate
    UNION ALL
    SELECT r.TradeAsset_ID, r.PriceAsset_ID, r.Qty, r.Bid, r.Ask, r.modified_date, 'CrossRates'
    FROM dbo.CrossRates r CROSS JOIN requested p
    WHERE r.InfoSource = p.infoSource AND p.tradeDate = p.asOfDate AND r.modified_date = p.tradeDate
)
SELECT f.code AS fromCurrency, t.code AS toCurrency, d.Qty AS units, d.rateDate, d.sourceTable,
       CASE WHEN d.Bid = d.Ask AND d.Bid > 0 AND d.Qty > 0
            THEN CONVERT(varchar(64), CAST(d.Bid AS decimal(32,12))) END AS rate
FROM dated d JOIN currencies f ON f.ID = d.TradeAsset_ID JOIN currencies t ON t.ID = d.PriceAsset_ID
WHERE f.code <> t.code
ORDER BY f.code, t.code, d.sourceTable
