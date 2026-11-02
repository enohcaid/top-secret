"""Corre ACE-Step (cover) sobre varios pedazos de audio en una sola carga del modelo: lo usa voces-sobre-beat.mjs para
pulir el beat sin voz (un tramo, letra vacía → instrumental) y para cantar cada tramo del beat pulido con solo su letra
(misma descripción y semilla: la misma voz). Juan, 2026-11-01: "pasar primero el beat por ACE y después las voces en
partes y anexarlas al beat".

    (desde fuentes/beats/ACE-Step-1.5) python -m uv run python <este archivo> <trabajo.json>
trabajo.json: {"caption", "bpm", "tonalidad", "fuerza", "semilla", "tramos": [{"src", "letra", "duracion", "salida", "semilla"?}]}
"""
import glob
import json
import os
import shutil
import sys

sys.path.insert(0, os.getcwd())
from acestep.handler import AceStepHandler            # noqa: E402
from acestep.llm_inference import LLMHandler          # noqa: E402
from acestep.inference import GenerationParams, GenerationConfig, generate_music  # noqa: E402

T = json.load(open(sys.argv[1], encoding='utf-8'))
dit = AceStepHandler()
dit.initialize_service(project_root=os.getcwd(), config_path='acestep-v15-turbo', device='cuda',
                       use_flash_attention=False, offload_to_cpu=True)
llm = LLMHandler()                                    # el cover no usa el LM, pero generate_music lo pide

for i, tr in enumerate(T['tramos']):
    if os.path.exists(tr['salida']):
        print(f'tramo {i}: ya estaba', flush=True)
        continue
    tmp = tr['salida'] + '.d'
    os.makedirs(tmp, exist_ok=True)
    letra = tr['letra'].strip()
    params = GenerationParams(
        task_type='cover', src_audio=tr['src'], caption=T['caption'], lyrics=letra or '[instrumental]',
        instrumental=not letra, vocal_language='en', bpm=T['bpm'], keyscale=T['tonalidad'],
        duration=tr['duracion'], audio_cover_strength=tr.get('fuerza', T['fuerza']), seed=tr.get('semilla', T['semilla']), thinking=False,
        use_cot_metas=False, use_cot_caption=False, use_cot_lyrics=False)
    config = GenerationConfig(batch_size=1, use_random_seed=False, seeds=[tr.get('semilla', T['semilla'])], audio_format='wav')
    r = generate_music(dit, llm, params, config, save_dir=tmp)
    hechos = glob.glob(os.path.join(tmp, '*.wav'))
    if not r.success or not hechos:
        print(f'tramo {i}: ERROR {r.error}', flush=True)
        sys.exit(1)
    shutil.move(hechos[0], tr['salida'])
    shutil.rmtree(tmp, ignore_errors=True)
    print(f'tramo {i}: listo ({tr["duracion"]:.1f} s)', flush=True)
print('TRAMOS_OK')
