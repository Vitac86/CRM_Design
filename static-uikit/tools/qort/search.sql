WITH terms AS (
    SELECT CAST(? AS varchar(128)) AS exactCode, CAST(? AS varchar(260)) AS prefix,
           CAST(? AS varchar(262)) AS fragment
), hits AS (
    SELECT a.ID, CASE WHEN a.ISIN = t.exactCode THEN 0 ELSE 2 END AS rankNo
    FROM dbo.Assets a CROSS JOIN terms t WHERE a.ISIN LIKE t.prefix ESCAPE '~'
    UNION ALL
    SELECT s.Asset_ID, CASE WHEN s.SecCode = t.exactCode THEN 1 ELSE 2 END
    FROM dbo.Securities s CROSS JOIN terms t WHERE s.SecCode LIKE t.prefix ESCAPE '~'
    UNION ALL
    SELECT a.ID, CASE WHEN a.ShortName LIKE t.prefix ESCAPE '~' OR a.ViewName LIKE t.prefix ESCAPE '~' THEN 3 ELSE 4 END
    FROM dbo.Assets a CROSS JOIN terms t
    WHERE a.ShortName LIKE t.fragment ESCAPE '~' OR a.ViewName LIKE t.fragment ESCAPE '~'
), ranked AS (
    SELECT ID, MIN(rankNo) AS rankNo FROM hits GROUP BY ID
), page AS (
    SELECT a.ID, a.ISIN, a.ShortName, a.ViewName, a.Name, a.AssetSort_Const, a.AssetClass_Const,
           a.EmitentFirm_ID, r.rankNo
    FROM ranked r JOIN dbo.Assets a ON a.ID = r.ID
    WHERE a.AssetType_Const = 1 AND (a.Enabled = 0 OR a.Enabled IS NULL)
      AND (/*assetClass*/)
    ORDER BY r.rankNo, a.ID
    OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
)
SELECT a.ID AS assetId, a.ISIN AS isin, a.ShortName AS shortName, a.ViewName AS viewName,
       a.Name AS displayName, a.AssetSort_Const AS sortId, a.AssetClass_Const AS classId,
       COALESCE(NULLIF(f.Name,''), f.FirmShortName) AS issuerName, f.FirmShortName AS issuerShortName, code.SecCode AS primaryCode
FROM page a LEFT JOIN dbo.Firms f ON f.ID = a.EmitentFirm_ID
CROSS JOIN terms t
OUTER APPLY (
    SELECT TOP (1) s.SecCode FROM dbo.Securities s WHERE s.Asset_ID = a.ID AND s.SecCode <> ''
    ORDER BY CASE WHEN s.SecCode = t.exactCode THEN 0 WHEN s.SecCode LIKE t.prefix ESCAPE '~' THEN 1 ELSE 2 END,
             CASE WHEN s.TSSection_ID = 1 THEN 0 ELSE 1 END, s.ID
) code
ORDER BY a.rankNo, a.ID
