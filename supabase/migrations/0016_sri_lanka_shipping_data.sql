-- Sri Lanka shipping reference data: all 25 districts' cities + postcodes,
-- and a universal (non-city-specific) weight-band rate table.
--
-- Source: "Sri Lankan Cities for WooCommerce" plugin (wordpress.org/plugins/sl-cities-woo/),
-- v1.0.0, published 2026-07-03 — 288 cities across all 25 districts, postal codes
-- verified against Sri Lanka Post and independent directories as of 2026-07-02
-- (see the plugin's includes/city-data.php doc comment). Fetched directly from the
-- plugin's public SVN trunk and parsed programmatically (scripts/etl not modified;
-- this was a one-off migration-authoring step, not a repo dependency) — no city
-- name or postcode in this file was hand-typed or guessed.
--
-- District names below match this project's EXISTING shipping_districts rows
-- exactly (all 25 already existed and are left untouched — no district is
-- deleted or recreated), except the plugin's "Moneragala" is mapped to this
-- project's existing "Monaragala" spelling — same district, cosmetic spelling
-- difference only.
--
-- Business rule (see 2026-08-20 instructions): shipping is NOT city/district
-- priced. Every city gets the identical rate per weight band:
--   1kg = Rs 400, each additional started kg = +Rs 60.
-- The existing calculate_shipping_cost(city_id, weight_g) function (see
-- 0002_functions.sql) is NOT changed — it already looks up shipping_rates by
-- (city_id, weight_band) and is already the sole, server-side, authoritative
-- price source. Making every city's rate row identical for a given band is
-- sufficient to satisfy "same price everywhere" without touching that function
-- or the app/RPC layer at all.

begin;

-- ---------------------------------------------------------------------
-- 1. Postal codes: shipping_cities has no postal_code column yet.
-- ---------------------------------------------------------------------
alter table public.shipping_cities add column if not exists postal_code text;

-- ---------------------------------------------------------------------
-- 2. Cities + postcodes for all 25 districts, deduped case-insensitively
--    against what's already there (the existing "kalutara" row is kept as
--    the canonical row for Kalutara — not deleted/recreated — and only
--    gains its postal_code; no duplicate "Kalutara" city is inserted).
-- ---------------------------------------------------------------------
with district_city_data (district_name, cities) as (
  values
  ('Colombo', '[{"name":"Colombo 1","postcode":"00100"},{"name":"Colombo 2","postcode":"00200"},{"name":"Colombo 3","postcode":"00300"},{"name":"Colombo 4","postcode":"00400"},{"name":"Colombo 5","postcode":"00500"},{"name":"Colombo 6","postcode":"00600"},{"name":"Colombo 7","postcode":"00700"},{"name":"Colombo 8","postcode":"00800"},{"name":"Colombo 9","postcode":"00900"},{"name":"Colombo 10","postcode":"01000"},{"name":"Colombo 11","postcode":"01100"},{"name":"Colombo 12","postcode":"01200"},{"name":"Colombo 13","postcode":"01300"},{"name":"Colombo 14","postcode":"01400"},{"name":"Colombo 15","postcode":"01500"},{"name":"Athurugiriya","postcode":"10150"},{"name":"Avissawella","postcode":"10700"},{"name":"Battaramulla","postcode":"10120"},{"name":"Boralesgamuwa","postcode":"10290"},{"name":"Dehiwala","postcode":"10350"},{"name":"Hanwella","postcode":"10650"},{"name":"Homagama","postcode":"10200"},{"name":"Kaduwela","postcode":"10640"},{"name":"Kesbewa","postcode":"10300"},{"name":"Kolonnawa","postcode":"10600"},{"name":"Kottawa","postcode":"10230"},{"name":"Kotte","postcode":"10100"},{"name":"Maharagama","postcode":"10280"},{"name":"Moratuwa","postcode":"10400"},{"name":"Mount Lavinia","postcode":"10370"},{"name":"Nugegoda","postcode":"10250"},{"name":"Padukka","postcode":"10500"},{"name":"Pannipitiya","postcode":"10230"},{"name":"Piliyandala","postcode":"10300"},{"name":"Rajagiriya","postcode":"10107"},{"name":"Ratmalana","postcode":"10390"}]'::jsonb),
  ('Gampaha', '[{"name":"Gampaha","postcode":"11000"},{"name":"Negombo","postcode":"11500"},{"name":"Ja-Ela","postcode":"11350"},{"name":"Kadawatha","postcode":"11850"},{"name":"Kandana","postcode":"11320"},{"name":"Katunayake","postcode":"11450"},{"name":"Kelaniya","postcode":"11600"},{"name":"Minuwangoda","postcode":"11550"},{"name":"Mirigama","postcode":"11200"},{"name":"Nittambuwa","postcode":"11880"},{"name":"Ragama","postcode":"11010"},{"name":"Seeduwa","postcode":"11410"},{"name":"Veyangoda","postcode":"11100"},{"name":"Wattala","postcode":"11300"},{"name":"Divulapitiya","postcode":"11250"},{"name":"Dompe","postcode":"11680"},{"name":"Attanagalla","postcode":"11120"},{"name":"Biyagama","postcode":"11650"},{"name":"Mahara","postcode":"11851"}]'::jsonb),
  ('Kalutara', '[{"name":"Kalutara","postcode":"12000"},{"name":"Panadura","postcode":"12500"},{"name":"Beruwala","postcode":"12070"},{"name":"Aluthgama","postcode":"12080"},{"name":"Bandaragama","postcode":"12530"},{"name":"Dodangoda","postcode":"12020"},{"name":"Horana","postcode":"12400"},{"name":"Ingiriya","postcode":"12440"},{"name":"Matugama","postcode":"12100"},{"name":"Wadduwa","postcode":"12560"},{"name":"Bulathsinhala","postcode":"12300"},{"name":"Agalawatta","postcode":"12200"},{"name":"Millaniya","postcode":"12412"}]'::jsonb),
  ('Kandy', '[{"name":"Kandy","postcode":"20000"},{"name":"Akurana","postcode":"20850"},{"name":"Ampitiya","postcode":"20160"},{"name":"Galagedara","postcode":"20100"},{"name":"Gampola","postcode":"20500"},{"name":"Gelioya","postcode":"20620"},{"name":"Hanguranketha","postcode":"20710"},{"name":"Kadugannawa","postcode":"20300"},{"name":"Katugastota","postcode":"20800"},{"name":"Kundasale","postcode":"20168"},{"name":"Nawalapitiya","postcode":"20650"},{"name":"Peradeniya","postcode":"20400"},{"name":"Pilimatalawa","postcode":"20450"},{"name":"Rikillagaskada","postcode":"20730"},{"name":"Teldeniya","postcode":"20900"},{"name":"Wattegama","postcode":"20810"}]'::jsonb),
  ('Matale', '[{"name":"Matale","postcode":"21000"},{"name":"Dambulla","postcode":"21100"},{"name":"Galewela","postcode":"21200"},{"name":"Naula","postcode":"21090"},{"name":"Palapathwela","postcode":"21070"},{"name":"Rattota","postcode":"21400"},{"name":"Sigiriya","postcode":"21120"},{"name":"Ukuwela","postcode":"21300"},{"name":"Yatawatta","postcode":"21056"},{"name":"Laggala-Pallegama","postcode":"21520"},{"name":"Wilgamuwa","postcode":"21530"}]'::jsonb),
  ('Nuwara Eliya', '[{"name":"Nuwara Eliya","postcode":"22200"},{"name":"Ginigathena","postcode":"20680"},{"name":"Hatton","postcode":"22000"},{"name":"Kotagala","postcode":"22080"},{"name":"Maskeliya","postcode":"22070"},{"name":"Nanu Oya","postcode":"22150"},{"name":"Talawakele","postcode":"22100"},{"name":"Walapane","postcode":"22270"},{"name":"Ambewela","postcode":"22216"}]'::jsonb),
  ('Galle', '[{"name":"Galle","postcode":"80000"},{"name":"Ambalangoda","postcode":"80300"},{"name":"Baddegama","postcode":"80200"},{"name":"Balapitiya","postcode":"80550"},{"name":"Benthota","postcode":"80500"},{"name":"Elpitiya","postcode":"80400"},{"name":"Habaraduwa","postcode":"80630"},{"name":"Hikkaduwa","postcode":"80240"},{"name":"Imaduwa","postcode":"80130"},{"name":"Koggala","postcode":"80630"},{"name":"Neluwa","postcode":"80082"},{"name":"Unawatuna","postcode":"80600"},{"name":"Ahangama","postcode":"80650"}]'::jsonb),
  ('Matara', '[{"name":"Matara","postcode":"81000"},{"name":"Akuressa","postcode":"81400"},{"name":"Deniyaya","postcode":"81500"},{"name":"Devinuwara","postcode":"81160"},{"name":"Dickwella","postcode":"81200"},{"name":"Hakmana","postcode":"81300"},{"name":"Kamburupitiya","postcode":"81100"},{"name":"Mirissa","postcode":"81740"},{"name":"Weligama","postcode":"81700"},{"name":"Malimbada","postcode":"81050"},{"name":"Thihagoda","postcode":"81280"},{"name":"Pitabeddara","postcode":"81450"},{"name":"Kotapola","postcode":"81480"}]'::jsonb),
  ('Hambantota', '[{"name":"Hambantota","postcode":"82000"},{"name":"Ambalantota","postcode":"82100"},{"name":"Angunakolapelessa","postcode":"82220"},{"name":"Beliatta","postcode":"82400"},{"name":"Tangalle","postcode":"82200"},{"name":"Tissamaharama","postcode":"82600"},{"name":"Weeraketiya","postcode":"82240"},{"name":"Lunugamvehera","postcode":"82634"},{"name":"Sooriyawewa","postcode":"82010"},{"name":"Walasmulla","postcode":"82450"}]'::jsonb),
  ('Jaffna', '[{"name":"Jaffna","postcode":"40000"},{"name":"Chavakachcheri","postcode":"40500"},{"name":"Chankanai","postcode":"40212"},{"name":"Karainagar","postcode":"40250"},{"name":"Kayts","postcode":"40270"},{"name":"Kopay","postcode":"40170"},{"name":"Manipay","postcode":"40200"},{"name":"Point Pedro","postcode":"40600"},{"name":"Tellippalai","postcode":"40130"},{"name":"Valvettithurai","postcode":"40540"},{"name":"Sandilipay","postcode":"40098"}]'::jsonb),
  ('Kilinochchi', '[{"name":"Kilinochchi","postcode":"42400"},{"name":"Pallai","postcode":"42550"},{"name":"Poonakary","postcode":"42600"},{"name":"Paranthan","postcode":"42500"}]'::jsonb),
  ('Mannar', '[{"name":"Mannar","postcode":"41000"},{"name":"Nanattan","postcode":"41033"},{"name":"Pesalai","postcode":"41210"},{"name":"Talaimannar","postcode":"41220"}]'::jsonb),
  ('Vavuniya', '[{"name":"Vavuniya","postcode":"43000"},{"name":"Cheddikulam","postcode":"43120"},{"name":"Nedunkeni","postcode":"43075"},{"name":"Omanthai","postcode":"43050"}]'::jsonb),
  ('Mullaitivu', '[{"name":"Mullaitivu","postcode":"42000"},{"name":"Oddusuddan","postcode":"42200"},{"name":"Puthukkudiyiruppu","postcode":"42530"},{"name":"Thunukkai","postcode":"42320"}]'::jsonb),
  ('Batticaloa', '[{"name":"Batticaloa","postcode":"30000"},{"name":"Eravur","postcode":"30300"},{"name":"Kattankudy","postcode":"30100"},{"name":"Kaluwanchikudy","postcode":"30200"},{"name":"Valaichchenai","postcode":"30400"},{"name":"Chenkalady","postcode":"30350"},{"name":"Oddamavadi","postcode":"30420"},{"name":"Arayampathy","postcode":"30150"}]'::jsonb),
  ('Ampara', '[{"name":"Ampara","postcode":"32000"},{"name":"Akkaraipattu","postcode":"32400"},{"name":"Kalmunai","postcode":"32300"},{"name":"Sainthamaruthu","postcode":"32280"},{"name":"Sammanthurai","postcode":"32200"},{"name":"Dehiattakandiya","postcode":"32150"},{"name":"Mahaoya","postcode":"32070"},{"name":"Padiyatalawa","postcode":"32100"},{"name":"Pottuvil","postcode":"32500"},{"name":"Uhana","postcode":"32060"},{"name":"Damana","postcode":"32014"}]'::jsonb),
  ('Trincomalee', '[{"name":"Trincomalee","postcode":"31000"},{"name":"Kantale","postcode":"31300"},{"name":"Kinniya","postcode":"31100"},{"name":"Muttur","postcode":"31200"},{"name":"Thampalakamam","postcode":"31046"},{"name":"Kuchchaveli","postcode":"31014"},{"name":"Gomarankadawala","postcode":"31026"},{"name":"Seruvila","postcode":"31260"}]'::jsonb),
  ('Kurunegala', '[{"name":"Kurunegala","postcode":"60000"},{"name":"Bingiriya","postcode":"60450"},{"name":"Dambadeniya","postcode":"60130"},{"name":"Galgamuwa","postcode":"60700"},{"name":"Hettipola","postcode":"60430"},{"name":"Ibbagamuwa","postcode":"60500"},{"name":"Kuliyapitiya","postcode":"60200"},{"name":"Maho","postcode":"60600"},{"name":"Narammala","postcode":"60100"},{"name":"Nikaweratiya","postcode":"60470"},{"name":"Pannala","postcode":"60160"},{"name":"Polgahawela","postcode":"60300"},{"name":"Wariyapola","postcode":"60400"},{"name":"Alawwa","postcode":"60280"},{"name":"Melsiripura","postcode":"60540"}]'::jsonb),
  ('Puttalam', '[{"name":"Puttalam","postcode":"61300"},{"name":"Anamaduwa","postcode":"61500"},{"name":"Chilaw","postcode":"61000"},{"name":"Dankotuwa","postcode":"61130"},{"name":"Mundal","postcode":"61250"},{"name":"Nattandiya","postcode":"61190"},{"name":"Wennappuwa","postcode":"61170"},{"name":"Marawila","postcode":"61210"},{"name":"Kalpitiya","postcode":"61360"},{"name":"Madampe","postcode":"61230"}]'::jsonb),
  ('Anuradhapura', '[{"name":"Anuradhapura","postcode":"50000"},{"name":"Eppawala","postcode":"50260"},{"name":"Galenbindunuwewa","postcode":"50390"},{"name":"Galnewa","postcode":"50170"},{"name":"Habarana","postcode":"50150"},{"name":"Kahatagasdigiliya","postcode":"50320"},{"name":"Kekirawa","postcode":"50100"},{"name":"Medawachchiya","postcode":"50500"},{"name":"Mihintale","postcode":"50300"},{"name":"Nochchiyagama","postcode":"50200"},{"name":"Padaviya","postcode":"50570"},{"name":"Talawa","postcode":"50230"},{"name":"Tambuttegama","postcode":"50240"},{"name":"Thirappane","postcode":"50072"}]'::jsonb),
  ('Polonnaruwa', '[{"name":"Polonnaruwa","postcode":"51000"},{"name":"Dimbulagala","postcode":"51031"},{"name":"Hingurakgoda","postcode":"51400"},{"name":"Kaduruwela","postcode":"51000"},{"name":"Medirigiriya","postcode":"51500"},{"name":"Minneriya","postcode":"51410"},{"name":"Welikanda","postcode":"51070"},{"name":"Elahera","postcode":"51258"}]'::jsonb),
  ('Badulla', '[{"name":"Badulla","postcode":"90000"},{"name":"Bandarawela","postcode":"90100"},{"name":"Diyatalawa","postcode":"90150"},{"name":"Ella","postcode":"90090"},{"name":"Haldummulla","postcode":"90180"},{"name":"Haputale","postcode":"90160"},{"name":"Mahiyanganaya","postcode":"90700"},{"name":"Passara","postcode":"90500"},{"name":"Welimada","postcode":"90200"},{"name":"Hali-Ela","postcode":"90060"},{"name":"Kandaketiya","postcode":"90020"},{"name":"Lunugala","postcode":"90530"},{"name":"Soranathota","postcode":"90008"}]'::jsonb),
  ('Monaragala', '[{"name":"Monaragala","postcode":"91000"},{"name":"Bibile","postcode":"91500"},{"name":"Buttala","postcode":"91100"},{"name":"Kataragama","postcode":"91400"},{"name":"Medagama","postcode":"91550"},{"name":"Siyambalanduwa","postcode":"91030"},{"name":"Thanamalvila","postcode":"91300"},{"name":"Wellawaya","postcode":"91200"},{"name":"Sewanagala","postcode":"70250"}]'::jsonb),
  ('Ratnapura', '[{"name":"Ratnapura","postcode":"70000"},{"name":"Balangoda","postcode":"70100"},{"name":"Eheliyagoda","postcode":"70600"},{"name":"Embilipitiya","postcode":"70200"},{"name":"Godakawela","postcode":"70160"},{"name":"Kahawatta","postcode":"70150"},{"name":"Kalawana","postcode":"70450"},{"name":"Kuruwita","postcode":"70500"},{"name":"Nivithigala","postcode":"70400"},{"name":"Opanayake","postcode":"70080"},{"name":"Pelmadulla","postcode":"70070"},{"name":"Rakwana","postcode":"70300"},{"name":"Weligepola","postcode":"70104"}]'::jsonb),
  ('Kegalle', '[{"name":"Kegalle","postcode":"71000"},{"name":"Aranayake","postcode":"71540"},{"name":"Bulathkohupitiya","postcode":"71230"},{"name":"Dehiowita","postcode":"71400"},{"name":"Deraniyagala","postcode":"71430"},{"name":"Galigamuwa","postcode":"71350"},{"name":"Kitulgala","postcode":"71720"},{"name":"Mawanella","postcode":"71500"},{"name":"Rambukkana","postcode":"71100"},{"name":"Ruwanwella","postcode":"71300"},{"name":"Warakapola","postcode":"71600"},{"name":"Yatiyantota","postcode":"71700"}]'::jsonb)
),
expanded as (
  select
    d.id as district_id,
    (c ->> 'name') as city_name,
    (c ->> 'postcode') as postcode
  from district_city_data dcd
  join public.shipping_districts d on lower(d.name) = lower(dcd.district_name)
  cross join lateral jsonb_array_elements(dcd.cities) as c
)
-- Fill in the postcode for the one city that already exists (Kalutara),
-- matched case-insensitively so it is never duplicated.
update public.shipping_cities sc
set postal_code = e.postcode
from expanded e
where sc.district_id = e.district_id
  and lower(sc.name) = lower(e.city_name)
  and sc.postal_code is null;

with district_city_data (district_name, cities) as (
  values
  ('Colombo', '[{"name":"Colombo 1","postcode":"00100"},{"name":"Colombo 2","postcode":"00200"},{"name":"Colombo 3","postcode":"00300"},{"name":"Colombo 4","postcode":"00400"},{"name":"Colombo 5","postcode":"00500"},{"name":"Colombo 6","postcode":"00600"},{"name":"Colombo 7","postcode":"00700"},{"name":"Colombo 8","postcode":"00800"},{"name":"Colombo 9","postcode":"00900"},{"name":"Colombo 10","postcode":"01000"},{"name":"Colombo 11","postcode":"01100"},{"name":"Colombo 12","postcode":"01200"},{"name":"Colombo 13","postcode":"01300"},{"name":"Colombo 14","postcode":"01400"},{"name":"Colombo 15","postcode":"01500"},{"name":"Athurugiriya","postcode":"10150"},{"name":"Avissawella","postcode":"10700"},{"name":"Battaramulla","postcode":"10120"},{"name":"Boralesgamuwa","postcode":"10290"},{"name":"Dehiwala","postcode":"10350"},{"name":"Hanwella","postcode":"10650"},{"name":"Homagama","postcode":"10200"},{"name":"Kaduwela","postcode":"10640"},{"name":"Kesbewa","postcode":"10300"},{"name":"Kolonnawa","postcode":"10600"},{"name":"Kottawa","postcode":"10230"},{"name":"Kotte","postcode":"10100"},{"name":"Maharagama","postcode":"10280"},{"name":"Moratuwa","postcode":"10400"},{"name":"Mount Lavinia","postcode":"10370"},{"name":"Nugegoda","postcode":"10250"},{"name":"Padukka","postcode":"10500"},{"name":"Pannipitiya","postcode":"10230"},{"name":"Piliyandala","postcode":"10300"},{"name":"Rajagiriya","postcode":"10107"},{"name":"Ratmalana","postcode":"10390"}]'::jsonb),
  ('Gampaha', '[{"name":"Gampaha","postcode":"11000"},{"name":"Negombo","postcode":"11500"},{"name":"Ja-Ela","postcode":"11350"},{"name":"Kadawatha","postcode":"11850"},{"name":"Kandana","postcode":"11320"},{"name":"Katunayake","postcode":"11450"},{"name":"Kelaniya","postcode":"11600"},{"name":"Minuwangoda","postcode":"11550"},{"name":"Mirigama","postcode":"11200"},{"name":"Nittambuwa","postcode":"11880"},{"name":"Ragama","postcode":"11010"},{"name":"Seeduwa","postcode":"11410"},{"name":"Veyangoda","postcode":"11100"},{"name":"Wattala","postcode":"11300"},{"name":"Divulapitiya","postcode":"11250"},{"name":"Dompe","postcode":"11680"},{"name":"Attanagalla","postcode":"11120"},{"name":"Biyagama","postcode":"11650"},{"name":"Mahara","postcode":"11851"}]'::jsonb),
  ('Kalutara', '[{"name":"Kalutara","postcode":"12000"},{"name":"Panadura","postcode":"12500"},{"name":"Beruwala","postcode":"12070"},{"name":"Aluthgama","postcode":"12080"},{"name":"Bandaragama","postcode":"12530"},{"name":"Dodangoda","postcode":"12020"},{"name":"Horana","postcode":"12400"},{"name":"Ingiriya","postcode":"12440"},{"name":"Matugama","postcode":"12100"},{"name":"Wadduwa","postcode":"12560"},{"name":"Bulathsinhala","postcode":"12300"},{"name":"Agalawatta","postcode":"12200"},{"name":"Millaniya","postcode":"12412"}]'::jsonb),
  ('Kandy', '[{"name":"Kandy","postcode":"20000"},{"name":"Akurana","postcode":"20850"},{"name":"Ampitiya","postcode":"20160"},{"name":"Galagedara","postcode":"20100"},{"name":"Gampola","postcode":"20500"},{"name":"Gelioya","postcode":"20620"},{"name":"Hanguranketha","postcode":"20710"},{"name":"Kadugannawa","postcode":"20300"},{"name":"Katugastota","postcode":"20800"},{"name":"Kundasale","postcode":"20168"},{"name":"Nawalapitiya","postcode":"20650"},{"name":"Peradeniya","postcode":"20400"},{"name":"Pilimatalawa","postcode":"20450"},{"name":"Rikillagaskada","postcode":"20730"},{"name":"Teldeniya","postcode":"20900"},{"name":"Wattegama","postcode":"20810"}]'::jsonb),
  ('Matale', '[{"name":"Matale","postcode":"21000"},{"name":"Dambulla","postcode":"21100"},{"name":"Galewela","postcode":"21200"},{"name":"Naula","postcode":"21090"},{"name":"Palapathwela","postcode":"21070"},{"name":"Rattota","postcode":"21400"},{"name":"Sigiriya","postcode":"21120"},{"name":"Ukuwela","postcode":"21300"},{"name":"Yatawatta","postcode":"21056"},{"name":"Laggala-Pallegama","postcode":"21520"},{"name":"Wilgamuwa","postcode":"21530"}]'::jsonb),
  ('Nuwara Eliya', '[{"name":"Nuwara Eliya","postcode":"22200"},{"name":"Ginigathena","postcode":"20680"},{"name":"Hatton","postcode":"22000"},{"name":"Kotagala","postcode":"22080"},{"name":"Maskeliya","postcode":"22070"},{"name":"Nanu Oya","postcode":"22150"},{"name":"Talawakele","postcode":"22100"},{"name":"Walapane","postcode":"22270"},{"name":"Ambewela","postcode":"22216"}]'::jsonb),
  ('Galle', '[{"name":"Galle","postcode":"80000"},{"name":"Ambalangoda","postcode":"80300"},{"name":"Baddegama","postcode":"80200"},{"name":"Balapitiya","postcode":"80550"},{"name":"Benthota","postcode":"80500"},{"name":"Elpitiya","postcode":"80400"},{"name":"Habaraduwa","postcode":"80630"},{"name":"Hikkaduwa","postcode":"80240"},{"name":"Imaduwa","postcode":"80130"},{"name":"Koggala","postcode":"80630"},{"name":"Neluwa","postcode":"80082"},{"name":"Unawatuna","postcode":"80600"},{"name":"Ahangama","postcode":"80650"}]'::jsonb),
  ('Matara', '[{"name":"Matara","postcode":"81000"},{"name":"Akuressa","postcode":"81400"},{"name":"Deniyaya","postcode":"81500"},{"name":"Devinuwara","postcode":"81160"},{"name":"Dickwella","postcode":"81200"},{"name":"Hakmana","postcode":"81300"},{"name":"Kamburupitiya","postcode":"81100"},{"name":"Mirissa","postcode":"81740"},{"name":"Weligama","postcode":"81700"},{"name":"Malimbada","postcode":"81050"},{"name":"Thihagoda","postcode":"81280"},{"name":"Pitabeddara","postcode":"81450"},{"name":"Kotapola","postcode":"81480"}]'::jsonb),
  ('Hambantota', '[{"name":"Hambantota","postcode":"82000"},{"name":"Ambalantota","postcode":"82100"},{"name":"Angunakolapelessa","postcode":"82220"},{"name":"Beliatta","postcode":"82400"},{"name":"Tangalle","postcode":"82200"},{"name":"Tissamaharama","postcode":"82600"},{"name":"Weeraketiya","postcode":"82240"},{"name":"Lunugamvehera","postcode":"82634"},{"name":"Sooriyawewa","postcode":"82010"},{"name":"Walasmulla","postcode":"82450"}]'::jsonb),
  ('Jaffna', '[{"name":"Jaffna","postcode":"40000"},{"name":"Chavakachcheri","postcode":"40500"},{"name":"Chankanai","postcode":"40212"},{"name":"Karainagar","postcode":"40250"},{"name":"Kayts","postcode":"40270"},{"name":"Kopay","postcode":"40170"},{"name":"Manipay","postcode":"40200"},{"name":"Point Pedro","postcode":"40600"},{"name":"Tellippalai","postcode":"40130"},{"name":"Valvettithurai","postcode":"40540"},{"name":"Sandilipay","postcode":"40098"}]'::jsonb),
  ('Kilinochchi', '[{"name":"Kilinochchi","postcode":"42400"},{"name":"Pallai","postcode":"42550"},{"name":"Poonakary","postcode":"42600"},{"name":"Paranthan","postcode":"42500"}]'::jsonb),
  ('Mannar', '[{"name":"Mannar","postcode":"41000"},{"name":"Nanattan","postcode":"41033"},{"name":"Pesalai","postcode":"41210"},{"name":"Talaimannar","postcode":"41220"}]'::jsonb),
  ('Vavuniya', '[{"name":"Vavuniya","postcode":"43000"},{"name":"Cheddikulam","postcode":"43120"},{"name":"Nedunkeni","postcode":"43075"},{"name":"Omanthai","postcode":"43050"}]'::jsonb),
  ('Mullaitivu', '[{"name":"Mullaitivu","postcode":"42000"},{"name":"Oddusuddan","postcode":"42200"},{"name":"Puthukkudiyiruppu","postcode":"42530"},{"name":"Thunukkai","postcode":"42320"}]'::jsonb),
  ('Batticaloa', '[{"name":"Batticaloa","postcode":"30000"},{"name":"Eravur","postcode":"30300"},{"name":"Kattankudy","postcode":"30100"},{"name":"Kaluwanchikudy","postcode":"30200"},{"name":"Valaichchenai","postcode":"30400"},{"name":"Chenkalady","postcode":"30350"},{"name":"Oddamavadi","postcode":"30420"},{"name":"Arayampathy","postcode":"30150"}]'::jsonb),
  ('Ampara', '[{"name":"Ampara","postcode":"32000"},{"name":"Akkaraipattu","postcode":"32400"},{"name":"Kalmunai","postcode":"32300"},{"name":"Sainthamaruthu","postcode":"32280"},{"name":"Sammanthurai","postcode":"32200"},{"name":"Dehiattakandiya","postcode":"32150"},{"name":"Mahaoya","postcode":"32070"},{"name":"Padiyatalawa","postcode":"32100"},{"name":"Pottuvil","postcode":"32500"},{"name":"Uhana","postcode":"32060"},{"name":"Damana","postcode":"32014"}]'::jsonb),
  ('Trincomalee', '[{"name":"Trincomalee","postcode":"31000"},{"name":"Kantale","postcode":"31300"},{"name":"Kinniya","postcode":"31100"},{"name":"Muttur","postcode":"31200"},{"name":"Thampalakamam","postcode":"31046"},{"name":"Kuchchaveli","postcode":"31014"},{"name":"Gomarankadawala","postcode":"31026"},{"name":"Seruvila","postcode":"31260"}]'::jsonb),
  ('Kurunegala', '[{"name":"Kurunegala","postcode":"60000"},{"name":"Bingiriya","postcode":"60450"},{"name":"Dambadeniya","postcode":"60130"},{"name":"Galgamuwa","postcode":"60700"},{"name":"Hettipola","postcode":"60430"},{"name":"Ibbagamuwa","postcode":"60500"},{"name":"Kuliyapitiya","postcode":"60200"},{"name":"Maho","postcode":"60600"},{"name":"Narammala","postcode":"60100"},{"name":"Nikaweratiya","postcode":"60470"},{"name":"Pannala","postcode":"60160"},{"name":"Polgahawela","postcode":"60300"},{"name":"Wariyapola","postcode":"60400"},{"name":"Alawwa","postcode":"60280"},{"name":"Melsiripura","postcode":"60540"}]'::jsonb),
  ('Puttalam', '[{"name":"Puttalam","postcode":"61300"},{"name":"Anamaduwa","postcode":"61500"},{"name":"Chilaw","postcode":"61000"},{"name":"Dankotuwa","postcode":"61130"},{"name":"Mundal","postcode":"61250"},{"name":"Nattandiya","postcode":"61190"},{"name":"Wennappuwa","postcode":"61170"},{"name":"Marawila","postcode":"61210"},{"name":"Kalpitiya","postcode":"61360"},{"name":"Madampe","postcode":"61230"}]'::jsonb),
  ('Anuradhapura', '[{"name":"Anuradhapura","postcode":"50000"},{"name":"Eppawala","postcode":"50260"},{"name":"Galenbindunuwewa","postcode":"50390"},{"name":"Galnewa","postcode":"50170"},{"name":"Habarana","postcode":"50150"},{"name":"Kahatagasdigiliya","postcode":"50320"},{"name":"Kekirawa","postcode":"50100"},{"name":"Medawachchiya","postcode":"50500"},{"name":"Mihintale","postcode":"50300"},{"name":"Nochchiyagama","postcode":"50200"},{"name":"Padaviya","postcode":"50570"},{"name":"Talawa","postcode":"50230"},{"name":"Tambuttegama","postcode":"50240"},{"name":"Thirappane","postcode":"50072"}]'::jsonb),
  ('Polonnaruwa', '[{"name":"Polonnaruwa","postcode":"51000"},{"name":"Dimbulagala","postcode":"51031"},{"name":"Hingurakgoda","postcode":"51400"},{"name":"Kaduruwela","postcode":"51000"},{"name":"Medirigiriya","postcode":"51500"},{"name":"Minneriya","postcode":"51410"},{"name":"Welikanda","postcode":"51070"},{"name":"Elahera","postcode":"51258"}]'::jsonb),
  ('Badulla', '[{"name":"Badulla","postcode":"90000"},{"name":"Bandarawela","postcode":"90100"},{"name":"Diyatalawa","postcode":"90150"},{"name":"Ella","postcode":"90090"},{"name":"Haldummulla","postcode":"90180"},{"name":"Haputale","postcode":"90160"},{"name":"Mahiyanganaya","postcode":"90700"},{"name":"Passara","postcode":"90500"},{"name":"Welimada","postcode":"90200"},{"name":"Hali-Ela","postcode":"90060"},{"name":"Kandaketiya","postcode":"90020"},{"name":"Lunugala","postcode":"90530"},{"name":"Soranathota","postcode":"90008"}]'::jsonb),
  ('Monaragala', '[{"name":"Monaragala","postcode":"91000"},{"name":"Bibile","postcode":"91500"},{"name":"Buttala","postcode":"91100"},{"name":"Kataragama","postcode":"91400"},{"name":"Medagama","postcode":"91550"},{"name":"Siyambalanduwa","postcode":"91030"},{"name":"Thanamalvila","postcode":"91300"},{"name":"Wellawaya","postcode":"91200"},{"name":"Sewanagala","postcode":"70250"}]'::jsonb),
  ('Ratnapura', '[{"name":"Ratnapura","postcode":"70000"},{"name":"Balangoda","postcode":"70100"},{"name":"Eheliyagoda","postcode":"70600"},{"name":"Embilipitiya","postcode":"70200"},{"name":"Godakawela","postcode":"70160"},{"name":"Kahawatta","postcode":"70150"},{"name":"Kalawana","postcode":"70450"},{"name":"Kuruwita","postcode":"70500"},{"name":"Nivithigala","postcode":"70400"},{"name":"Opanayake","postcode":"70080"},{"name":"Pelmadulla","postcode":"70070"},{"name":"Rakwana","postcode":"70300"},{"name":"Weligepola","postcode":"70104"}]'::jsonb),
  ('Kegalle', '[{"name":"Kegalle","postcode":"71000"},{"name":"Aranayake","postcode":"71540"},{"name":"Bulathkohupitiya","postcode":"71230"},{"name":"Dehiowita","postcode":"71400"},{"name":"Deraniyagala","postcode":"71430"},{"name":"Galigamuwa","postcode":"71350"},{"name":"Kitulgala","postcode":"71720"},{"name":"Mawanella","postcode":"71500"},{"name":"Rambukkana","postcode":"71100"},{"name":"Ruwanwella","postcode":"71300"},{"name":"Warakapola","postcode":"71600"},{"name":"Yatiyantota","postcode":"71700"}]'::jsonb)
),
expanded as (
  select
    d.id as district_id,
    (c ->> 'name') as city_name,
    (c ->> 'postcode') as postcode
  from district_city_data dcd
  join public.shipping_districts d on lower(d.name) = lower(dcd.district_name)
  cross join lateral jsonb_array_elements(dcd.cities) as c
)
insert into public.shipping_cities (district_id, name, sort_order, postal_code)
select e.district_id, e.city_name, row_number() over (partition by e.district_id order by e.city_name), e.postcode
from expanded e
where not exists (
  select 1 from public.shipping_cities sc
  where sc.district_id = e.district_id and lower(sc.name) = lower(e.city_name)
);

-- ---------------------------------------------------------------------
-- 3. Weight bands: replace the old ad-hoc bands (0-500g / 500g-1kg /
--    1kg-2kg / 2kg-5kg / 5kg+, priced only for Kalutara during earlier
--    testing) with strict 1kg-wide bands matching the new universal rule.
--    120 bands covers up to 120kg; a final open-ended band above that
--    keeps checkout from ever failing on an unrealistically heavy order,
--    priced at the same rate as the 120kg band (a pragmatic ceiling, not
--    part of the stated business rule, which doesn't define a maximum).
--
--    Idempotent by construction: only bands that DON'T match the target
--    1kg-wide spec are removed (the old 5 legacy ones, the first time this
--    runs), and only missing target bands are inserted — so re-running
--    this migration is a no-op on shipping_weight_bands, not a
--    delete-and-recreate that churns row IDs and cascades into
--    shipping_rates on every run.
-- ---------------------------------------------------------------------
delete from public.shipping_weight_bands b
where not exists (
  select 1 from generate_series(1, 120) as k
  where b.min_weight_g = (k - 1) * 1000 and b.max_weight_g = k * 1000
)
and not (b.min_weight_g = 120000 and b.max_weight_g = 999999999);

insert into public.shipping_weight_bands (min_weight_g, max_weight_g, label)
select (k - 1) * 1000, k * 1000, k || 'kg'
from generate_series(1, 120) as k
where not exists (
  select 1 from public.shipping_weight_bands b
  where b.min_weight_g = (k - 1) * 1000 and b.max_weight_g = k * 1000
);

insert into public.shipping_weight_bands (min_weight_g, max_weight_g, label)
select 120000, 999999999, '120kg+'
where not exists (
  select 1 from public.shipping_weight_bands b
  where b.min_weight_g = 120000 and b.max_weight_g = 999999999
);

-- ---------------------------------------------------------------------
-- 4. Rates: identical price per band for every city (400 for the first
--    kg, +60 per additional started kg — matches
--    shipping = 400 + max(0, ceil(kg) - 1) * 60 exactly for every band
--    boundary, since each band is exactly 1kg wide).
-- ---------------------------------------------------------------------
insert into public.shipping_rates (city_id, weight_band_id, price)
select
  c.id,
  b.id,
  -- least(120, ...) so the open-ended 120kg+ catch-all band (max_weight_g =
  -- 999999999) prices at the same rate as the 120kg band instead of a
  -- runaway figure computed from its own huge upper bound.
  400 + greatest(0, least(120, ceil(b.max_weight_g / 1000.0)::int) - 1) * 60
from public.shipping_cities c
cross join public.shipping_weight_bands b
on conflict (city_id, weight_band_id) do update set price = excluded.price, updated_at = now();

commit;
