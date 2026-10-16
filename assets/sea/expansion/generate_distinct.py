"""Distinct top-down silhouettes for the expansion's four active special ships."""

SHAPES = {
    'missile': ('#e9bc75', '''
      <path d="M20 111L90 88H370L501 128L370 168H90L20 145Z" fill="url(#metal)"/>
      <path d="M70 37H354L416 70L355 88H70Z M70 219H354L416 186L355 168H70Z" fill="#718b92"/>
      <path d="M80 54H340M80 202H340" stroke="#d4d7cc" stroke-width="5"/>
      <path d="M52 106H368L457 128L368 150H52Z" fill="url(#deck)"/>
      <rect x="192" y="94" width="86" height="68" rx="8" fill="url(#metal)"/>
      <rect x="222" y="105" width="42" height="46" rx="4" fill="#1e3c53"/>
      <path d="M102 48V74M143 48V74M304 48V74M347 48V74M102 182V208M143 182V208M304 182V208M347 182V208" stroke="#e9bc75" stroke-width="14"/>
    '''),
    'guardian': ('#80dbff', '''
      <path d="M23 43L101 25H365L494 68L366 99H101L23 84Z M23 172L101 157H366L494 188L365 231H101L23 213Z" fill="url(#metal)"/>
      <path d="M54 57H359L451 70L359 85H54Z M54 184H359L451 186L359 216H54Z" fill="url(#deck)"/>
      <path d="M107 91L182 111H322L407 91M107 165L182 145H322L407 165" fill="none" stroke="#adc4c5" stroke-width="12"/>
      <path d="M178 108L225 82H295L340 108V148L295 174H225L178 148Z" fill="url(#metal)"/>
      <circle cx="258" cy="128" r="38" fill="#22495a"/><circle cx="258" cy="128" r="28" fill="url(#core)"/>
      <circle cx="80" cy="70" r="12" fill="#80dbff"/><circle cx="80" cy="189" r="12" fill="#80dbff"/>
    '''),
    'tender': ('#8befba', '''
      <path d="M25 57H371L487 106V150L371 199H25L12 174V82Z" fill="url(#metal)"/>
      <path d="M40 75H358L452 109V147L358 181H40Z" fill="url(#deck)"/>
      <rect x="56" y="84" width="109" height="88" rx="9" fill="#cadad1"/>
      <path d="M111 95V161M78 128H144" stroke="#64bc94" stroke-width="17"/>
      <path d="M187 58V35H309V58M187 199V221H309V199" fill="none" stroke="#c5d7c7" stroke-width="13"/>
      <rect x="188" y="93" width="97" height="70" rx="8" fill="url(#metal)"/>
      <rect x="304" y="93" width="48" height="70" rx="6" fill="#9fc2b6"/>
      <path d="M366 91L428 118V139L366 165" fill="none" stroke="#8befba" stroke-width="8"/>
    '''),
    'dreadnought': ('#b5a0f4', '''
      <path d="M25 42H318L428 73L501 94V162L428 183L318 214H25L5 164V92Z" fill="url(#metal)"/>
      <path d="M42 62H318L420 91L474 108V148L420 166L318 194H42Z" fill="url(#deck)"/>
      <path d="M54 77H312M54 179H312M330 75L448 109M330 181L448 147" stroke="#b8a9d7" stroke-width="5"/>
      <path d="M165 78L218 59H287L329 81V175L287 197H218L165 178Z" fill="#47546a"/>
      <rect x="205" y="91" width="93" height="74" rx="7" fill="url(#metal)"/>
      <path d="M34 118H493M34 138H493" stroke="#c5b6f0" stroke-width="5"/>
      <path d="M81 61L107 31L150 61M81 195L107 225L150 195M354 68L385 42L415 80M354 188L385 214L415 176" fill="#4f536c"/>
      <circle cx="91" cy="128" r="27" fill="url(#metal)"/>
      <circle cx="363" cy="128" r="27" fill="url(#metal)"/>
      <circle cx="426" cy="128" r="27" fill="url(#metal)"/>
      <path d="M91 118H136M91 138H136M363 118H408M363 138H408M426 118H471M426 138H471" stroke="#b5a0f4" stroke-width="7"/>
    ''')
}

def generate(folder, svg):
    for kind, (accent, content) in SHAPES.items():
        body = '<g stroke="#172d39" stroke-width="4" stroke-linejoin="round">' + content + '</g>'
        (folder / f'{kind}-v1.svg').write_text(svg(body, 512, 256, accent), encoding='utf-8')
