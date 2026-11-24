SELECT a.ID AS assetId, a.ISIN AS isin, a.ShortName AS shortName, a.ViewName AS viewName,
       a.Name AS displayName, a.AssetSort_Const AS sortId, a.AssetClass_Const AS classId,
       COALESCE(NULLIF(f.Name,''), f.FirmShortName) AS issuerName, f.FirmShortName AS issuerShortName, a.IsTrading AS isTrading,
       CONVERT(varchar(60), CAST(a.BaseValue AS decimal(32,12))) AS currentNominal,
       nc.ShortName AS nominalCurrency, a.IsIndexedFV AS indexedNominal,
       a.CFI AS cfi, a.EmitDate AS issueDate, a.CancelDate AS maturityDate,
       linked.ShortName AS linkedCurrency,
       CONVERT(varchar(60), CAST(a.BaseValueOrigin AS decimal(32,12))) AS originalNominal,
       CONVERT(varchar(60), CAST(m.TickSize AS decimal(32,12))) AS tickSize,
       mc.ShortName AS marketPriceCurrency, pay.ShortName AS settlementCurrency,
       m.IsProcent AS marketPercent, m.SettleDate AS marketSettlementDate,
       CONVERT(int, CONVERT(char(8), GETDATE(), 112)) AS asOfDate,
       s.SecCode AS code, s.TSSection_ID AS sectionId, ts.Name AS sectionName,
       s.IsProcent AS percentFlag, s.IsTrading AS securityTrading, s.LotSize AS lotSize,
       s.Scale AS priceScale, qc.ShortName AS quoteCurrency
FROM dbo.Assets a
LEFT JOIN dbo.Firms f ON f.ID = a.EmitentFirm_ID
LEFT JOIN dbo.Assets nc ON nc.ID = a.BaseCurrencyAsset_ID AND a.BaseCurrencyAsset_ID > 0
LEFT JOIN dbo.MarketInfo m ON m.Asset_ID = a.ID AND m.TSSection_ID = 1
LEFT JOIN dbo.Assets mc ON mc.ID = m.PriceAsset_ID AND mc.ID > 0
LEFT JOIN dbo.Assets linked ON linked.ID = m.LinkedCurrency_ID AND linked.ID > 0
LEFT JOIN dbo.Assets pay ON pay.ID = m.PayAsset_ID AND pay.ID > 0
LEFT JOIN dbo.Securities s ON s.Asset_ID = a.ID
LEFT JOIN dbo.TSSections ts ON ts.ID = s.TSSection_ID
LEFT JOIN dbo.Assets qc ON qc.ID = s.CurrPriceAsset_ID AND s.CurrPriceAsset_ID > 0
WHERE a.ID = ? AND a.AssetType_Const = 1 AND (a.Enabled = 0 OR a.Enabled IS NULL)
ORDER BY CASE WHEN s.TSSection_ID = 1 THEN 0 ELSE 1 END,
         CASE WHEN s.IsTrading = 'y' THEN 0 ELSE 1 END, s.TSSection_ID, s.SecCode, s.ID
