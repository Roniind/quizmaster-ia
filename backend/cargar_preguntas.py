from main import SessionLocal, Pregunta, OpcionRespuesta, Categoria, DificultadEnum
db = SessionLocal()

def get_cat(nombre):
    cat = db.query(Categoria).filter(Categoria.nombre == nombre).first()
    if not cat:
        cat = Categoria(nombre=nombre, descripcion=nombre)
        db.add(cat)
        db.flush()
    return cat.id

def add(enunciado, opciones, dificultad, cat_id):
    p = Pregunta(enunciado=enunciado, categoria_id=cat_id, dificultad=DificultadEnum(dificultad))
    db.add(p)
    db.flush()
    for i, (texto, correcta) in enumerate(opciones):
        db.add(OpcionRespuesta(pregunta_id=p.id, texto=texto, es_correcta=correcta, orden=i))

# PROGRAMACIÓN
prog = get_cat("Programación")
add("¿Qué significa HTML?", [("HyperText Markup Language", True), ("High Text Machine Language", False), ("HyperTool Markup Language", False), ("HyperText Modern Language", False)], "facil", prog)
add("¿Cuál es el operador de módulo en Python?", [("%", True), ("//", False), ("**", False), ("&", False)], "facil", prog)
add("¿Qué es una función recursiva?", [("Una función que se llama a sí misma", True), ("Una función sin parámetros", False), ("Una función que retorna None", False), ("Una función anidada", False)], "media", prog)
add("¿Qué estructura de datos usa FIFO?", [("Cola (Queue)", True), ("Pila (Stack)", False), ("Árbol", False), ("Grafo", False)], "facil", prog)
add("¿Qué es la herencia en POO?", [("Mecanismo para que una clase herede atributos de otra", True), ("Copiar variables entre funciones", False), ("Declarar múltiples variables", False), ("Importar módulos externos", False)], "media", prog)
add("¿Cuál es la complejidad de ordenamiento burbuja en el peor caso?", [("O(n²)", True), ("O(n)", False), ("O(log n)", False), ("O(n log n)", False)], "dificil", prog)
add("¿Qué hace la palabra clave 'break' en un ciclo?", [("Termina el ciclo inmediatamente", True), ("Salta a la siguiente iteración", False), ("Reinicia el ciclo", False), ("Pausa el ciclo", False)], "facil", prog)
add("¿Qué es un API REST?", [("Interfaz de comunicación entre sistemas usando HTTP", True), ("Un lenguaje de programación", False), ("Un tipo de base de datos", False), ("Un framework de Python", False)], "media", prog)
add("¿Qué patrón de diseño garantiza una sola instancia de una clase?", [("Singleton", True), ("Factory", False), ("Observer", False), ("Decorator", False)], "dificil", prog)
add("¿Qué es el polimorfismo?", [("Capacidad de objetos de responder al mismo mensaje de distintas formas", True), ("Ocultar atributos de una clase", False), ("Heredar métodos de otra clase", False), ("Crear múltiples instancias", False)], "media", prog)

# MATEMÁTICAS
mat = get_cat("Matemáticas")
add("¿Cuánto es 15% de 200?", [("30", True), ("25", False), ("35", False), ("20", False)], "facil", mat)
add("¿Cuál es la fórmula del área de un círculo?", [("π × r²", True), ("2 × π × r", False), ("π × d", False), ("r² × 2", False)], "facil", mat)
add("¿Qué es un número primo?", [("Un número divisible solo por 1 y por sí mismo", True), ("Un número par mayor que 2", False), ("Un número divisible por 3", False), ("Un número negativo", False)], "facil", mat)
add("¿Cuánto es la raíz cuadrada de 144?", [("12", True), ("14", False), ("11", False), ("13", False)], "facil", mat)
add("¿Qué es una derivada?", [("La tasa de cambio instantánea de una función", True), ("El área bajo una curva", False), ("La suma de infinitos términos", False), ("El límite de una función", False)], "dificil", mat)
add("¿Cuál es el resultado de 2³ + 3²?", [("17", True), ("15", False), ("18", False), ("13", False)], "media", mat)
add("¿Qué es el teorema de Pitágoras?", [("a² + b² = c² en un triángulo rectángulo", True), ("a + b = c en cualquier triángulo", False), ("El área del triángulo es base × altura", False), ("La suma de ángulos es 180°", False)], "media", mat)
add("¿Cuánto es sen(90°)?", [("1", True), ("0", False), ("−1", False), ("0.5", False)], "media", mat)
add("¿Qué es una integral definida?", [("El área bajo la curva entre dos puntos", True), ("La pendiente de una recta", False), ("El valor máximo de una función", False), ("La derivada de segundo orden", False)], "dificil", mat)
add("¿Cuál es el valor de π aproximado?", [("3.1416", True), ("3.1214", False), ("3.1618", False), ("3.1200", False)], "facil", mat)

# HISTORIA
his = get_cat("Historia")
add("¿En qué año se descubrió América?", [("1492", True), ("1498", False), ("1488", False), ("1502", False)], "facil", his)
add("¿Quién fue el primer presidente de Colombia?", [("Simón Bolívar", True), ("Francisco de Paula Santander", False), ("Antonio Nariño", False), ("Rafael Núñez", False)], "media", his)
add("¿En qué año terminó la Segunda Guerra Mundial?", [("1945", True), ("1944", False), ("1946", False), ("1943", False)], "facil", his)
add("¿Qué civilización construyó el Machu Picchu?", [("Inca", True), ("Maya", False), ("Azteca", False), ("Olmeca", False)], "facil", his)
add("¿En qué año cayó el Muro de Berlín?", [("1989", True), ("1991", False), ("1987", False), ("1985", False)], "media", his)
add("¿Quién fue Napoleón Bonaparte?", [("Emperador francés y general militar", True), ("Rey de Inglaterra", False), ("Presidente de España", False), ("General ruso", False)], "facil", his)
add("¿En qué año se firmó la independencia de Colombia?", [("1810", True), ("1819", False), ("1821", False), ("1830", False)], "media", his)
add("¿Qué fue la Revolución Francesa?", [("Movimiento político que derrocó la monarquía en 1789", True), ("Guerra entre Francia e Inglaterra en 1750", False), ("Independencia de Francia de Roma", False), ("Revolución industrial en París", False)], "media", his)
add("¿Quién escribió el Manifiesto Comunista?", [("Karl Marx y Friedrich Engels", True), ("Lenin y Stalin", False), ("Mao Tse-tung", False), ("Rousseau y Voltaire", False)], "dificil", his)
add("¿Cuándo ocurrió la Revolución Rusa?", [("1917", True), ("1905", False), ("1921", False), ("1914", False)], "media", his)

# CIENCIAS
cie = get_cat("Ciencias")
add("¿Cuál es el símbolo químico del oro?", [("Au", True), ("Go", False), ("Or", False), ("Ag", False)], "facil", cie)
add("¿Cuántos huesos tiene el cuerpo humano adulto?", [("206", True), ("208", False), ("196", False), ("212", False)], "media", cie)
add("¿Qué gas necesitan las plantas para la fotosíntesis?", [("Dióxido de carbono (CO₂)", True), ("Oxígeno (O₂)", False), ("Nitrógeno (N₂)", False), ("Hidrógeno (H₂)", False)], "facil", cie)
add("¿Cuál es la velocidad de la luz?", [("300.000 km/s", True), ("150.000 km/s", False), ("500.000 km/s", False), ("200.000 km/s", False)], "media", cie)
add("¿Qué es la mitosis?", [("División celular que produce dos células idénticas", True), ("Fusión de dos células", False), ("Reproducción sexual", False), ("Muerte celular programada", False)], "media", cie)
add("¿Cuál es la fórmula del agua?", [("H₂O", True), ("HO₂", False), ("H₂O₂", False), ("HO", False)], "facil", cie)
add("¿Qué es la gravedad?", [("Fuerza de atracción entre masas", True), ("Fuerza de repulsión entre átomos", False), ("Energía cinética de un objeto", False), ("Presión atmosférica", False)], "facil", cie)
add("¿Qué es el ADN?", [("Molécula que contiene la información genética", True), ("Proteína que da energía a las células", False), ("Tipo de lípido celular", False), ("Enzima digestiva", False)], "media", cie)
add("¿Cuál es la ley de la gravitación universal de Newton?", [("F = G × m1 × m2 / r²", True), ("F = m × a", False), ("E = mc²", False), ("P = m × v", False)], "dificil", cie)
add("¿Qué es un neutrón?", [("Partícula subatómica sin carga eléctrica", True), ("Partícula con carga positiva", False), ("Partícula con carga negativa", False), ("Partícula de luz", False)], "media", cie)

# INGLÉS
ing = get_cat("Inglés")
add("¿Cómo se dice 'perro' en inglés?", [("Dog", True), ("Cat", False), ("Bird", False), ("Fish", False)], "facil", ing)
add("¿Cuál es el pasado de 'go'?", [("Went", True), ("Goed", False), ("Gone", False), ("Going", False)], "facil", ing)
add("¿Qué significa 'Nevertheless'?", [("Sin embargo", True), ("Por lo tanto", False), ("Además", False), ("Aunque", False)], "dificil", ing)
add("¿Cómo se dice 'Buenos días' en inglés?", [("Good morning", True), ("Good night", False), ("Good afternoon", False), ("Good evening", False)], "facil", ing)
add("¿Cuál es el plural de 'child'?", [("Children", True), ("Childs", False), ("Childes", False), ("Childrens", False)], "media", ing)
add("¿Qué significa 'Although'?", [("Aunque", True), ("Porque", False), ("Cuando", False), ("Mientras", False)], "media", ing)
add("¿Cuál es el superlativo de 'good'?", [("The best", True), ("The gooder", False), ("The most good", False), ("The better", False)], "media", ing)
add("¿Qué tiempo verbal es 'I have eaten'?", [("Present perfect", True), ("Simple past", False), ("Past perfect", False), ("Future perfect", False)], "dificil", ing)
add("¿Cómo se dice 'biblioteca' en inglés?", [("Library", True), ("Bookstore", False), ("Laboratory", False), ("Librarian", False)], "facil", ing)
add("¿Qué significa 'Moreover'?", [("Además", True), ("Sin embargo", False), ("Por lo tanto", False), ("En cambio", False)], "dificil", ing)

db.commit()
db.close()
print("✅ 50 preguntas cargadas correctamente")
