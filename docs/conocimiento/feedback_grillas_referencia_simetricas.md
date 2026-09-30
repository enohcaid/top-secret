---
name: grillas-referencia-simetricas
description: "Al armar planillas/grillas HTML de referencia para que ChatGPT genere una placa, organizarlas simétricamente"
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-08-03T15:29:08.033Z
---

Cuando arme una "planilla" o "hoja de escudos" de referencia (HTML + screenshot vía gstack) para pasarle a ChatGPT y que genere una placa/gráfica, la grilla tiene que quedar organizada simétricamente — no una grid.template-columns fija que deja la última fila incompleta/desalineada.

**Por qué**: el 2026-08-03, al armar la hoja de escudos del fixture VPN T3 (19 rivales), usé `grid-template-columns: repeat(5, 1fr)` — con 19 ítems la última fila quedó con 4 en vez de 5, pegados a la izquierda con un hueco a la derecha. El usuario pidió que la próxima vez la grilla salga simétrica para que la placa final (generada por ChatGPT a partir de esa referencia) también salga mejor organizada — la referencia asimétrica se traslada a la gráfica final.

**Cómo aplicar**:
- Si la cantidad de ítems no es múltiplo exacto del número de columnas elegido, o (a) elegir un número de columnas que sí divida exacto, o (b) centrar la última fila incompleta (`justify-content:center` en esa fila, o ítems vacíos invisibles de relleno), en vez de dejarla pegada a un lado.
- Si la placa final va a tener una estructura conocida (por ejemplo, dos columnas de N filas cada una, como el fixture que arma en dos columnas J1-J10 y J11-J19), armar la planilla de referencia con esa MISMA estructura (mismo split de columnas, mismo conteo por columna) en vez de una tabla lineal de una sola columna — así ChatGPT no tiene que inventar cómo repartir los ítems en columnas, ya lo ve resuelto en la referencia.
- En general: pensar la referencia como un boceto de la composición final, no solo como una lista de datos correctos — la prolijidad visual de la referencia se nota en el resultado.
