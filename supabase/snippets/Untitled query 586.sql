select
  (select count(*) from ayahs)                            as ajeti,
  (select count(*) from translations)                     as prijevodi,
  (select count(*) from surahs where name_ar is not null) as sure_sa_arapskim,
  (select count(*) from profiles)                         as nalozi;