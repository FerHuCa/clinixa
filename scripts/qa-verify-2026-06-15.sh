#!/usr/bin/env bash
# Verification of the 6 applied QA fixes against the running dev API (:5050).
# Prints "LABEL | actual=<code> | expected=<code>" lines + the two content checks.
# Dev-auth: header 'X-HealthHub-Dev-User: <userId>'. FIX 6 was applied as Option B
# (patient may read own specialty data), so the patient diet GET expects 200.
set -uo pipefail
B=http://127.0.0.1:5050
code(){ curl -s -o /dev/null -w "%{http_code}" "$@"; }

echo "## FIX 1 — specialty endpoints reachable by owner, denied cross-specialty"
# owner writes a diet (proves 201). Title is recognizable so it can be cleaned up after.
RESP=$(curl -s -w $'\n%{http_code}' -X POST \
  -H 'X-HealthHub-Dev-User: usr-laura-vega' -H 'Content-Type: application/json' \
  -d '{"patientId":"ana-martinez","title":"QA-VERIFY-2026-06-15","content":"verify run","validFrom":"2026-06-22"}' \
  "$B/api/patient-diets")
DIET_CODE=$(echo "$RESP" | tail -1)
DIET_ID=$(echo "$RESP" | sed '$d' | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('id',''))" 2>/dev/null || echo "")
echo "FIX1 diet POST laura(owner)      | actual=$DIET_CODE | expected=201"
echo "FIX1 created_diet_id=$DIET_ID"
echo "FIX1 task GET nora(owner)        | actual=$(code -H 'X-HealthHub-Dev-User: usr-nora-ibarra' "$B/api/patient-tasks?patientId=sofia-leon") | expected=200"
echo "FIX1 presc POST laura(non-doc)   | actual=$(code -X POST -H 'X-HealthHub-Dev-User: usr-laura-vega' -H 'Content-Type: application/json' -d '{"patientId":"ana-martinez","medicationName":"X","dosage":"1","frequency":"1","duration":"1","instructions":"i","refills":0}' "$B/api/prescriptions") | expected=403"

echo "## FIX 6 — patient reads own specialty data (Option B)"
echo "FIX6 diet GET ana(patient-own)   | actual=$(code -H 'X-HealthHub-Dev-User: usr-ana-martinez' "$B/api/patient-diets?patientId=ana-martinez") | expected=200"

echo "## FIX 2 — professional cannot book for unrelated patient"
echo "FIX2 cross-book nora->ana        | actual=$(code -X POST -H 'X-HealthHub-Dev-User: usr-nora-ibarra' -H 'Content-Type: application/json' -d '{"patientId":"ana-martinez","date":"2026-07-13","time":"12:30","reason":"x","professionalServiceId":"svc-nora-terapia"}' "$B/api/appointments") | expected=403"

echo "## FIX 3 — clinical access only via active relationship (no PHI leak)"
echo "FIX3 SOAP POST nora->ana         | actual=$(code -X POST -H 'X-HealthHub-Dev-User: usr-nora-ibarra' -H 'Content-Type: application/json' -d '{"patientId":"ana-martinez","date":"2026-06-15","title":"x","status":"draft","subjective":"s","objective":"o","assessment":"a","plan":"p","aiGenerated":false}' "$B/api/soap-notes") | expected=403"
SOAP_LEAK=$(curl -s -H 'X-HealthHub-Dev-User: usr-nora-ibarra' "$B/api/soap-notes" | grep -c "ana-martinez")
echo "FIX3 SOAP GET nora leak(ana)     | actual=$SOAP_LEAK | expected=0"

echo "## FIX 4 — clean identity (no forged header, no ?userId impersonation)"
echo "FIX4 me bogus-header             | actual=$(code -H 'X-HealthHub-Dev-User: usr-fantasma' "$B/api/me") | expected=401"
echo "FIX4 me ?userId=laura(bogus)     | actual=$(code -H 'X-HealthHub-Dev-User: usr-fantasma' "$B/api/me?userId=usr-laura-vega") | expected=401"
echo "FIX4 me laura-real               | actual=$(code -H 'X-HealthHub-Dev-User: usr-laura-vega' "$B/api/me") | expected=200"
echo "FIX4 payments ?userId imperson.  | actual=$(code -H 'X-HealthHub-Dev-User: usr-ana-martinez' "$B/api/professional-portal/payments?userId=usr-laura-vega") | expected=401"

echo "## FIX 5 — available-slots deduped by id"
SLOTS=$(curl -s -H 'X-HealthHub-Dev-User: usr-ana-martinez' "$B/api/professionals/pro-laura-vega/available-slots?serviceId=svc-laura-inicial&days=21" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);ids=[s['id'] for s in d];print(f'total={len(ids)} unique={len(set(ids))}')" 2>/dev/null || echo "total=ERR unique=ERR")
echo "FIX5 slots dedup laura           | $SLOTS | expected=total==unique"
echo "## DONE"
