-- Návrh a potvrzení plánu termínů (use case: telefonát Veroniky se studentem).
-- Student zakládán bez plánu; plán vzniká návrhem (délky v měsících), student
-- ho potvrzuje jednorázovým odkazem z e-mailu. Do potvrzení nelze nahrávat
-- a neběží připomínková kaskáda.

alter table students
  add column delka_acc_mesicu integer,
  add column delka_celkem_mesicu integer,
  add column plan_navrh_odeslan_at timestamptz,
  add column plan_potvrzen_at timestamptz,
  add column plan_potvrzeni_token text;

comment on column students.delka_acc_mesicu is 'Domluvená délka ACC fáze v měsících (9–36); u programu upgrade_pcc null';
comment on column students.delka_celkem_mesicu is 'Domluvená celková délka studia v měsících (PCC 18–60); u programu acc = délka ACC';
comment on column students.plan_navrh_odeslan_at is 'Kdy byl studentovi naposledy odeslán návrh plánu k potvrzení';
comment on column students.plan_potvrzen_at is 'Kdy student plán potvrdil — od té chvíle je závazný (null = nepotvrzeno)';
comment on column students.plan_potvrzeni_token is 'Jednorázový token potvrzovacího odkazu; nový návrh starý token přepíše, potvrzení ho smaže';

create unique index students_plan_potvrzeni_token_idx
  on students (plan_potvrzeni_token)
  where plan_potvrzeni_token is not null;

-- Studenti založení před zavedením potvrzování už plán domluvený mají —
-- jejich stávající plány se berou jako potvrzené (kaskáda a nahrávání běží dál).
update students s
set plan_potvrzen_at = now()
where plan_potvrzen_at is null
  and exists (select 1 from plan_items p where p.student_id = s.id);
