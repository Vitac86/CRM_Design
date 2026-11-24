-- Independent read-only comparison supplied with the manual test plan.
SELECT
  A.ID AS AssetID,
  A.ISIN,
  A.ViewName AS AssetShortName,
  A.BaseValue AS CurrentNominal,
  A.BaseCurrencyAsset_ID AS NominalCurrencyAssetID,
  d.settlementDate AS SettlementDate,
  P.NKD AS MainNKD,
  P.SourceTable AS MainSourceTable,
  P.ObservationDate AS MainObservationDate,
  O.NKD AS OTCNKD,
  O.SourceTable AS OTCSourceTable,
  O.ObservationDate AS OTCObservationDate,
  CASE
    WHEN P.NKD IS NOT NULL THEN 'PRIMARY_TPLUS'
    WHEN O.NKD IS NOT NULL THEN 'FALLBACK_OTC_101'
    ELSE 'DEFAULT_ZERO'
  END AS SourceStatus,
  COALESCE(P.NKD, O.NKD, CONVERT(DECIMAL(24,8),0)) AS SelectedNKDRaw,
  ROUND(COALESCE(P.NKD, O.NKD, CONVERT(DECIMAL(24,8),0)), 2) AS DisplayNKD_ComparisonOnly
FROM dbo.Assets AS A
CROSS JOIN (SELECT CAST(? AS int) AS settlementDate, CAST(? AS int) AS asOfDate) d
OUTER APPLY (
  SELECT TOP (1) X.NKD, X.SourceTable, X.ObservationDate
  FROM (
    SELECT M.SettleDateAccrued AS NKD,
           N'MarketInfo' AS SourceTable,
           CAST(NULL AS INT) AS ObservationDate,
           0 AS SourcePriority,
           CAST(0 AS BIGINT) AS RecordID
    FROM dbo.MarketInfo AS M
    WHERE M.Asset_ID = A.ID AND M.TSSection_ID = 1
      AND M.SettleDate = d.settlementDate
      AND M.SettleDateAccrued IS NOT NULL
    UNION ALL
    SELECT H.SettleDateAccrued AS NKD,
           N'MarketInfoHist' AS SourceTable,
           H.OldDate AS ObservationDate,
           1 AS SourcePriority,
           CAST(H.ID AS BIGINT) AS RecordID
    FROM dbo.MarketInfoHist AS H
    WHERE H.Asset_ID = A.ID AND H.TSSection_ID = 1
      AND H.SettleDate = d.settlementDate
      AND H.OldDate <= d.asOfDate
      AND H.SettleDateAccrued IS NOT NULL
  ) AS X
  ORDER BY X.SourcePriority, X.ObservationDate DESC, X.RecordID DESC
) AS P
OUTER APPLY (
  SELECT TOP (1) X.NKD, X.SourceTable, X.ObservationDate
  FROM (
    SELECT M.SettleDateAccrued AS NKD,
           N'MarketInfo' AS SourceTable,
           CAST(NULL AS INT) AS ObservationDate,
           0 AS SourcePriority,
           CAST(0 AS BIGINT) AS RecordID
    FROM dbo.MarketInfo AS M
    WHERE M.Asset_ID = A.ID AND M.TSSection_ID = 101
      AND M.SettleDate = d.settlementDate
      AND M.SettleDateAccrued IS NOT NULL
    UNION ALL
    SELECT H.SettleDateAccrued AS NKD,
           N'MarketInfoHist' AS SourceTable,
           H.OldDate AS ObservationDate,
           1 AS SourcePriority,
           CAST(H.ID AS BIGINT) AS RecordID
    FROM dbo.MarketInfoHist AS H
    WHERE H.Asset_ID = A.ID AND H.TSSection_ID = 101
      AND H.SettleDate = d.settlementDate
      AND H.OldDate <= d.asOfDate
      AND H.SettleDateAccrued IS NOT NULL
  ) AS X
  ORDER BY X.SourcePriority, X.ObservationDate DESC, X.RecordID DESC
) AS O
WHERE A.ID = ? AND A.ISIN = ?;
