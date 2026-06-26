# Backfill: cifrado en reposo de columnas PHI clínicas

## Contexto

La migración `202606250001_EncryptClinicalPhi` amplía las columnas clínicas a tipo `text`
para que quepan los valores cifrados. Sin embargo, **las filas existentes siguen en plaintext**
hasta que se ejecute este backfill.

**NOTA (2026-06-25):** El piloto Clinixa no tiene datos clínicos reales en producción aún
(citas pagadas = 0, notas SOAP = seed de dev). Este backfill es un procedimiento documentado
para cuando haya datos reales que migrar, y para entornos de desarrollo/staging.

---

## Cuándo ejecutar

- Antes de abrir el piloto a los primeros usuarios reales, si ya existen filas de seed/dev.
- En staging antes de cada QA cycle.
- Nunca en producción mientras el piloto esté en vuelo activo sin ventana de mantenimiento.

---

## Cómo funciona el re-cifrado

El re-cifrado **no puede hacerse en SQL puro** porque requiere la clave AES (disponible solo
en la aplicación, nunca en la BD). Se hace a través de un comando de consola .NET que:

1. Carga la configuración normal (incluye `ENCRYPTION_KEY` / `Security:EncryptionKey`).
2. Itera las filas de `soap_notes` y `patient_records`.
3. Detecta si un valor **ya está cifrado** intentando `Unprotect`: si tiene éxito, omite la fila.
4. Si el valor parece plaintext (Unprotect retorna null o lanza), lo cifra con `Protect` y guarda.
5. Opera en transacciones de 100 filas para ser interrumpible sin pérdida de trabajo.

### Ejecutar

```bash
cd apps/api
# Con cadena de conexión y clave de cifrado en el entorno:
HEALTHHUB_DB_CONNECTION="..." ENCRYPTION_KEY="<base64-32-bytes>" \
  dotnet run --project HealthHub.Api.csproj -- backfill-phi
```

El comando `backfill-phi` está implementado en `Infrastructure/PhiBackfillCommand.cs` y se
activa desde `Program.cs` cuando `args[0] == "backfill-phi"`.

### Verificar idempotencia

El comando puede ejecutarse múltiples veces de forma segura:
- Filas ya cifradas (Unprotect exitoso) → **omitidas**, no se doble-cifran.
- Filas plaintext → cifradas y guardadas.
- Filas con ciphertext de otra clave → Unprotect retorna null → se tratan como plaintext
  y se RE-CIFRAN con la clave actual. **Asegurarse de no rotar la clave mientras hay
  datos en la BD sin haber completado el backfill.**

---

## Guardia de seguridad

```
DO NOT run this against a live production DB without:
1. A verified backup taken in the last hour.
2. A maintenance window (no writes during backfill).
3. Confirmation that ENCRYPTION_KEY matches the key already in use by the API.
```

---

## Referencia de columnas afectadas

| Tabla           | Columnas cifradas                            |
|-----------------|----------------------------------------------|
| `soap_notes`    | `Subjective`, `Objective`, `Assessment`, `Plan` |
| `patient_records` | `Summary`                                  |
