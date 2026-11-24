WITH params AS (
    SELECT CAST(? AS float) AS assetId, CAST(? AS int) AS settleDate,
           CAST(? AS int) AS asOfDate, CAST(? AS int) AS sectionId
)
SELECT p.sectionId, p.asOfDate, bv.records AS nominalRecords,
       CONVERT(varchar(60), CAST(bv.nominal AS decimal(32,12))) AS datedNominal, cur.SettleDateAccrued AS currentValue,
       hist.SettleDateAccrued AS historyValue, hist.OldDate AS historyObservationDate,
       CONVERT(varchar(64), COALESCE(cur.SettleDateAccrued,hist.SettleDateAccrued), 3) AS rawValue,
       CONVERT(varchar(64), CAST(COALESCE(cur.SettleDateAccrued,hist.SettleDateAccrued) AS decimal(32,12))) AS decimalValue,
       price.ShortName AS marketPriceCurrency, pay.ShortName AS settlementCurrency,
       COALESCE(cur.IsProcent,hist.IsProcent) AS percentFlag
FROM params p
OUTER APPLY (
    SELECT COUNT(*) AS records, CASE WHEN COUNT(b.BaseValue) = COUNT(*) AND MIN(b.BaseValue) = MAX(b.BaseValue) THEN MIN(b.BaseValue) END AS nominal
    FROM dbo.AssetsBaseValues b WHERE b.Asset_ID = p.assetId AND b.BVDate = p.settleDate
) bv
OUTER APPLY (
    SELECT TOP (1) m.SettleDateAccrued, m.IsProcent, m.PriceAsset_ID, m.PayAsset_ID
    FROM dbo.MarketInfo m
    WHERE m.TSSection_ID = p.sectionId AND m.Asset_ID = p.assetId
      AND m.SettleDate = p.settleDate AND m.SettleDateAccrued IS NOT NULL
    ORDER BY m.ID DESC
) cur
OUTER APPLY (
    SELECT TOP (1) h.SettleDateAccrued, h.OldDate, h.IsProcent, h.PriceAsset_ID, h.PayAsset_ID
    FROM dbo.MarketInfoHist h
    WHERE cur.SettleDateAccrued IS NULL AND h.TSSection_ID = p.sectionId AND h.Asset_ID = p.assetId
      AND h.SettleDate = p.settleDate AND h.OldDate <= p.asOfDate AND h.SettleDateAccrued IS NOT NULL
    ORDER BY h.OldDate DESC, h.ID DESC
) hist
LEFT JOIN dbo.Assets price ON price.ID = COALESCE(cur.PriceAsset_ID,hist.PriceAsset_ID) AND price.ID > 0
LEFT JOIN dbo.Assets pay ON pay.ID = COALESCE(cur.PayAsset_ID,hist.PayAsset_ID) AND pay.ID > 0
