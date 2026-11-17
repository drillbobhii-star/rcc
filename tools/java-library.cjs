// Original Java examples for RCC. Each entry is standalone and targets Java 17+.
// Keep examples educational, dependency-free, and compile-tested. Do not generate parameter permutations.
module.exports = [
  {
    id: 'hello-world',
    name: 'Java: Hola, mundo',
    description: 'Primer programa Java: punto de entrada main, salida por consola y estructura de una clase.',
    category: 'Fundamentos',
    code: String.raw`public class Main {
    public static void main(String[] args) {
        System.out.println("Hola, RCC!");
        System.out.println("Java está listo para crear algo nuevo.");
    }
}`
  },
  {
    id: 'cli-arguments',
    name: 'Java: Argumentos de consola',
    description: 'Lee argumentos al iniciar, valida su presencia y construye una respuesta sin depender de librerías externas.',
    category: 'Fundamentos',
    code: String.raw`public class Main {
    public static void main(String[] args) {
        if (args.length == 0) {
            System.out.println("Uso: java Main <nombre>");
            return;
        }
        String name = String.join(" ", args).trim();
        if (name.isEmpty()) {
            System.out.println("El nombre no puede estar vacío.");
            return;
        }
        System.out.println("Bienvenido, " + name + "!");
    }
}`
  },
  {
    id: 'safe-calculator',
    name: 'Java: Calculadora validada',
    description: 'Calculadora de consola con operaciones básicas, validación de números y control de división entre cero.',
    category: 'Fundamentos',
    code: String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        try (Scanner input = new Scanner(System.in)) {
            System.out.print("Primer número: ");
            if (!input.hasNextDouble()) {
                System.out.println("Introduce un número válido.");
                return;
            }
            double first = input.nextDouble();

            System.out.print("Operador (+, -, *, /): ");
            String operator = input.next();

            System.out.print("Segundo número: ");
            if (!input.hasNextDouble()) {
                System.out.println("Introduce un número válido.");
                return;
            }
            double second = input.nextDouble();

            double result;
            switch (operator) {
                case "+" -> result = first + second;
                case "-" -> result = first - second;
                case "*" -> result = first * second;
                case "/" -> {
                    if (second == 0) {
                        System.out.println("No se puede dividir entre cero.");
                        return;
                    }
                    result = first / second;
                }
                default -> {
                    System.out.println("Operador no reconocido.");
                    return;
                }
            }
            System.out.printf("Resultado: %.2f%n", result);
        }
    }
}`
  },
  {
    id: 'temperature-converter',
    name: 'Java: Conversor de temperatura',
    description: 'Convierte Celsius a Fahrenheit y Kelvin con una función reutilizable y salida formateada.',
    category: 'Utilidades',
    code: String.raw`public class Main {
    private static double toFahrenheit(double celsius) {
        return celsius * 9.0 / 5.0 + 32.0;
    }

    private static double toKelvin(double celsius) {
        return celsius + 273.15;
    }

    public static void main(String[] args) {
        double celsius = 25.0;
        System.out.printf("%.1f °C = %.1f °F%n", celsius, toFahrenheit(celsius));
        System.out.printf("%.1f °C = %.2f K%n", celsius, toKelvin(celsius));
    }
}`
  },
  {
    id: 'input-validation',
    name: 'Java: Validación de entradas',
    description: 'Comprueba texto vacío, longitud mínima y caracteres permitidos antes de aceptar un identificador.',
    category: 'Validación',
    code: String.raw`public class Main {
    private static boolean isValidUsername(String value) {
        if (value == null) return false;
        String name = value.trim();
        return name.length() >= 3
            && name.length() <= 16
            && name.matches("[A-Za-z0-9_]+");
    }

    public static void main(String[] args) {
        for (String candidate : new String[] {"RCC_User", "ab", "nombre con espacios", "Java17"}) {
            System.out.printf("%-24s %s%n", candidate, isValidUsername(candidate) ? "válido" : "inválido");
        }
    }
}`
  },
  {
    id: 'string-palindrome',
    name: 'Java: Comprobar palíndromos',
    description: 'Normaliza texto y comprueba si se lee igual al derecho y al revés, ignorando espacios y puntuación.',
    category: 'Cadenas',
    code: String.raw`import java.util.Locale;

public class Main {
    private static boolean isPalindrome(String text) {
        String normalized = text.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]", "");
        return normalized.contentEquals(new StringBuilder(normalized).reverse());
    }

    public static void main(String[] args) {
        String[] samples = {"Anita lava la tina", "Java RCC", "A man, a plan, a canal: Panama"};
        for (String sample : samples) {
            System.out.println(sample + " -> " + isPalindrome(sample));
        }
    }
}`
  },
  {
    id: 'fizz-buzz',
    name: 'Java: FizzBuzz configurable',
    description: 'Recorre una secuencia y aplica reglas divisibles por 3 y 5; demuestra condicionales y bucles.',
    category: 'Algoritmos',
    code: String.raw`public class Main {
    public static void main(String[] args) {
        int limit = 30;
        for (int number = 1; number <= limit; number++) {
            boolean byThree = number % 3 == 0;
            boolean byFive = number % 5 == 0;

            if (byThree && byFive) System.out.println("FizzBuzz");
            else if (byThree) System.out.println("Fizz");
            else if (byFive) System.out.println("Buzz");
            else System.out.println(number);
        }
    }
}`
  },
  {
    id: 'fibonacci-iterative',
    name: 'Java: Serie de Fibonacci',
    description: 'Genera Fibonacci de forma iterativa con long y un límite que evita pedir una secuencia excesiva.',
    category: 'Algoritmos',
    code: String.raw`public class Main {
    public static void main(String[] args) {
        int terms = 12;
        if (terms < 1 || terms > 90) {
            throw new IllegalArgumentException("La cantidad debe estar entre 1 y 90.");
        }

        long previous = 0;
        long current = 1;
        for (int index = 0; index < terms; index++) {
            System.out.print(previous + (index + 1 == terms ? "\\n" : ", "));
            long next = previous + current;
            previous = current;
            current = next;
        }
    }
}`
  },
  {
    id: 'prime-number',
    name: 'Java: Detector de números primos',
    description: 'Determina si un entero es primo usando divisores hasta la raíz cuadrada.',
    category: 'Algoritmos',
    code: String.raw`public class Main {
    private static boolean isPrime(int number) {
        if (number < 2) return false;
        if (number == 2) return true;
        if (number % 2 == 0) return false;

        for (int divisor = 3; divisor <= number / divisor; divisor += 2) {
            if (number % divisor == 0) return false;
        }
        return true;
    }

    public static void main(String[] args) {
        for (int number = 1; number <= 40; number++) {
            if (isPrime(number)) System.out.print(number + " ");
        }
        System.out.println();
    }
}`
  },
  {
    id: 'array-statistics',
    name: 'Java: Estadísticas de un arreglo',
    description: 'Calcula mínimo, máximo, suma y promedio sin modificar los datos originales.',
    category: 'Arreglos',
    code: String.raw`import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int[] values = {12, 4, 19, 7, 15, 2};
        if (values.length == 0) {
            System.out.println("No hay datos.");
            return;
        }

        int minimum = values[0];
        int maximum = values[0];
        long sum = 0;
        for (int value : values) {
            minimum = Math.min(minimum, value);
            maximum = Math.max(maximum, value);
            sum += value;
        }

        System.out.println("Datos: " + Arrays.toString(values));
        System.out.println("Mínimo: " + minimum);
        System.out.println("Máximo: " + maximum);
        System.out.println("Suma: " + sum);
        System.out.printf("Promedio: %.2f%n", (double) sum / values.length);
    }
}`
  },
  {
    id: 'binary-search',
    name: 'Java: Búsqueda binaria',
    description: 'Busca un valor en un arreglo ordenado en tiempo logarítmico y devuelve -1 si no existe.',
    category: 'Algoritmos',
    code: String.raw`import java.util.Arrays;

public class Main {
    private static int binarySearch(int[] values, int target) {
        int low = 0;
        int high = values.length - 1;

        while (low <= high) {
            int middle = low + (high - low) / 2;
            if (values[middle] == target) return middle;
            if (values[middle] < target) low = middle + 1;
            else high = middle - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] values = {3, 8, 12, 17, 25, 31, 44};
        Arrays.sort(values);
        int target = 25;
        System.out.println("Índice de " + target + ": " + binarySearch(values, target));
    }
}`
  },
  {
    id: 'array-list-sort',
    name: 'Java: Filtrar y ordenar listas',
    description: 'Combina ArrayList, stream, filtros y Comparator para crear una lista ordenada sin alterar la original.',
    category: 'Colecciones',
    code: String.raw`import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<Integer> scores = new ArrayList<>(List.of(45, 82, 67, 91, 58, 76));
        List<Integer> approved = scores.stream()
            .filter(score -> score >= 60)
            .sorted(Comparator.reverseOrder())
            .toList();

        System.out.println("Original: " + scores);
        System.out.println("Aprobados, de mayor a menor: " + approved);
    }
}`
  },
  {
    id: 'set-unique-values',
    name: 'Java: Eliminar duplicados con Set',
    description: 'Usa LinkedHashSet para conservar el orden de llegada mientras elimina valores repetidos.',
    category: 'Colecciones',
    code: String.raw`import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public class Main {
    public static void main(String[] args) {
        List<String> names = List.of("Luna", "Río", "Luna", "Sol", "Río", "Nube");
        Set<String> uniqueNames = new LinkedHashSet<>(names);

        System.out.println("Antes: " + names);
        System.out.println("Únicos: " + uniqueNames);
    }
}`
  },
  {
    id: 'word-frequency',
    name: 'Java: Frecuencia de palabras',
    description: 'Cuenta palabras con HashMap, normaliza mayúsculas y muestra el resultado ordenado por frecuencia.',
    category: 'Colecciones',
    code: String.raw`import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;

public class Main {
    public static void main(String[] args) {
        String text = "RCC crea código Java y RCC comparte código";
        Map<String, Integer> frequency = new HashMap<>();

        for (String word : text.toLowerCase().split("\\s+")) {
            String clean = word.replaceAll("[^\\p{L}\\p{N}]", "");
            if (!clean.isEmpty()) frequency.merge(clean, 1, Integer::sum);
        }

        Map<String, Integer> sorted = new TreeMap<>(frequency);
        sorted.forEach((word, count) -> System.out.println(word + ": " + count));
    }
}`
  },
  {
    id: 'queue-processing',
    name: 'Java: Cola de tareas FIFO',
    description: 'Modela una cola de atención con ArrayDeque: el primero que entra es el primero en salir.',
    category: 'Colecciones',
    code: String.raw`import java.util.ArrayDeque;
import java.util.Queue;

public class Main {
    public static void main(String[] args) {
        Queue<String> tasks = new ArrayDeque<>();
        tasks.offer("Cargar catálogo");
        tasks.offer("Validar datos");
        tasks.offer("Generar informe");

        while (!tasks.isEmpty()) {
            String next = tasks.poll();
            System.out.println("Procesando: " + next);
        }
    }
}`
  },
  {
    id: 'undo-stack',
    name: 'Java: Historial deshacer / rehacer',
    description: 'Usa dos pilas para ilustrar el historial de acciones y la operación de deshacer.',
    category: 'Colecciones',
    code: String.raw`import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    public static void main(String[] args) {
        Deque<String> undo = new ArrayDeque<>();
        Deque<String> redo = new ArrayDeque<>();

        apply("Crear documento", undo, redo);
        apply("Cambiar título", undo, redo);
        apply("Añadir párrafo", undo, redo);

        String reverted = undo.pop();
        redo.push(reverted);
        System.out.println("Deshecho: " + reverted);
        System.out.println("Acción disponible para rehacer: " + redo.peek());
    }

    private static void apply(String action, Deque<String> undo, Deque<String> redo) {
        undo.push(action);
        redo.clear();
    }
}`
  },
  {
    id: 'student-class',
    name: 'Java: Clases y encapsulación',
    description: 'Crea una clase Student con campos privados, constructor validado y métodos de acceso.',
    category: 'POO',
    code: String.raw`public class Main {
    static class Student {
        private final String name;
        private final double grade;

        Student(String name, double grade) {
            if (name == null || name.isBlank()) throw new IllegalArgumentException("Nombre requerido.");
            if (grade < 0 || grade > 100) throw new IllegalArgumentException("Nota fuera de rango.");
            this.name = name;
            this.grade = grade;
        }

        String getName() { return name; }
        double getGrade() { return grade; }
        boolean passed() { return grade >= 60; }
    }

    public static void main(String[] args) {
        Student student = new Student("Alex", 87.5);
        System.out.printf("%s: %.1f (%s)%n", student.getName(), student.getGrade(),
            student.passed() ? "Aprobado" : "Pendiente");
    }
}`
  },
  {
    id: 'strategy-interface',
    name: 'Java: Interfaces y estrategias',
    description: 'Aplica el patrón Strategy con una interfaz funcional para elegir reglas sin duplicar el flujo principal.',
    category: 'POO',
    code: String.raw`public class Main {
    @FunctionalInterface
    interface DiscountPolicy {
        double apply(double price);
    }

    private static double checkout(double price, DiscountPolicy policy) {
        if (price < 0) throw new IllegalArgumentException("El precio no puede ser negativo.");
        return policy.apply(price);
    }

    public static void main(String[] args) {
        DiscountPolicy regular = price -> price;
        DiscountPolicy member = price -> price * 0.90;
        System.out.printf("Regular: %.2f%n", checkout(100, regular));
        System.out.printf("Miembro: %.2f%n", checkout(100, member));
    }
}`
  },
  {
    id: 'enum-order-status',
    name: 'Java: Enum con comportamiento',
    description: 'Representa estados permitidos con enum y asocia a cada estado una etiqueta y una condición.',
    category: 'POO',
    code: String.raw`public class Main {
    enum OrderStatus {
        CREATED("Creado", false),
        PAID("Pagado", false),
        SHIPPED("Enviado", false),
        DELIVERED("Entregado", true),
        CANCELLED("Cancelado", true);

        private final String label;
        private final boolean finalState;

        OrderStatus(String label, boolean finalState) {
            this.label = label;
            this.finalState = finalState;
        }

        String label() { return label; }
        boolean isFinal() { return finalState; }
    }

    public static void main(String[] args) {
        for (OrderStatus status : OrderStatus.values()) {
            System.out.println(status.name() + " · " + status.label() + " · final=" + status.isFinal());
        }
    }
}`
  },
  {
    id: 'student-record',
    name: 'Java: Records inmutables',
    description: 'Usa record de Java para transportar datos inmutables y validar sus valores en el constructor compacto.',
    category: 'POO',
    code: String.raw`public class Main {
    record Student(String name, int age, double grade) {
        Student {
            if (name == null || name.isBlank()) throw new IllegalArgumentException("Nombre requerido.");
            if (age < 0 || age > 120) throw new IllegalArgumentException("Edad inválida.");
            if (grade < 0 || grade > 100) throw new IllegalArgumentException("Nota inválida.");
        }
    }

    public static void main(String[] args) {
        Student student = new Student("Mía", 19, 94.5);
        System.out.println(student);
        System.out.println("Nombre: " + student.name());
    }
}`
  },
  {
    id: 'generic-pair',
    name: 'Java: Genéricos reutilizables',
    description: 'Implementa Pair<T,U> para guardar dos tipos distintos con seguridad de tipos.',
    category: 'POO',
    code: String.raw`public class Main {
    record Pair<A, B>(A first, B second) {}

    public static void main(String[] args) {
        Pair<String, Integer> user = new Pair<>("Luben", 18);
        Pair<String, Boolean> feature = new Pair<>("VIP", true);

        System.out.println(user.first() + " · " + user.second());
        System.out.println(feature.first() + " activo: " + feature.second());
    }
}`
  },
  {
    id: 'custom-exception',
    name: 'Java: Excepciones personalizadas',
    description: 'Define una excepción propia y separa el error esperado del flujo normal de ejecución.',
    category: 'Errores',
    code: String.raw`public class Main {
    static class InvalidScoreException extends Exception {
        InvalidScoreException(String message) {
            super(message);
        }
    }

    private static void validateScore(int score) throws InvalidScoreException {
        if (score < 0 || score > 100) {
            throw new InvalidScoreException("La puntuación debe estar entre 0 y 100.");
        }
    }

    public static void main(String[] args) {
        try {
            validateScore(125);
            System.out.println("Puntuación válida.");
        } catch (InvalidScoreException error) {
            System.out.println("No se pudo guardar: " + error.getMessage());
        }
    }
}`
  },
  {
    id: 'text-file-storage',
    name: 'Java: Guardar y leer un archivo',
    description: 'Usa Path y Files para escribir y leer texto UTF-8; maneja errores de entrada y salida.',
    category: 'Archivos',
    code: String.raw`import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class Main {
    public static void main(String[] args) throws IOException {
        Path file = Path.of("rcc-notas.txt");
        String content = "Primera nota de RCC\\nJava 17+ · UTF-8\\n";

        Files.writeString(file, content, StandardCharsets.UTF_8);
        String saved = Files.readString(file, StandardCharsets.UTF_8);

        System.out.println("Archivo: " + file.toAbsolutePath());
        System.out.println(saved);
    }
}`
  },
  {
    id: 'csv-summary',
    name: 'Java: Resumen de un CSV sencillo',
    description: 'Lee filas CSV simples, valida columnas numéricas y calcula un total; no pretende interpretar comas entrecomilladas.',
    category: 'Datos',
    code: String.raw`import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<String> rows = List.of(
            "producto,cantidad,precio",
            "Cuaderno,3,45.50",
            "Lápiz,5,12.00",
            "Regla,2,25.00"
        );

        double total = 0;
        for (int index = 1; index < rows.size(); index++) {
            String[] columns = rows.get(index).split(",");
            if (columns.length != 3) {
                System.out.println("Fila ignorada: " + rows.get(index));
                continue;
            }
            try {
                int quantity = Integer.parseInt(columns[1].trim());
                double price = Double.parseDouble(columns[2].trim());
                if (quantity < 0 || price < 0) throw new NumberFormatException("Valor negativo.");
                total += quantity * price;
            } catch (NumberFormatException error) {
                System.out.println("Datos inválidos: " + rows.get(index));
            }
        }
        System.out.printf("Total: %.2f%n", total);
    }
}`
  },
  {
    id: 'stream-analysis',
    name: 'Java: Estadísticas con Streams',
    description: 'Filtra valores, transforma datos y resume una colección mediante la API Stream.',
    category: 'Datos',
    code: String.raw`import java.util.List;
import java.util.DoubleSummaryStatistics;

public class Main {
    public static void main(String[] args) {
        List<Double> times = List.of(12.5, 18.0, 9.5, 22.0, 15.0, 0.0);
        DoubleSummaryStatistics stats = times.stream()
            .filter(time -> time > 0)
            .mapToDouble(Double::doubleValue)
            .summaryStatistics();

        System.out.println("Muestras válidas: " + stats.getCount());
        System.out.println("Mínimo: " + stats.getMin());
        System.out.println("Máximo: " + stats.getMax());
        System.out.printf("Promedio: %.2f%n", stats.getAverage());
    }
}`
  },
  {
    id: 'optional-search',
    name: 'Java: Optional para búsquedas',
    description: 'Devuelve Optional en vez de null y define una respuesta alternativa cuando no existe el registro.',
    category: 'Datos',
    code: String.raw`import java.util.List;
import java.util.Optional;

public class Main {
    private static Optional<String> findUser(List<String> users, String expected) {
        return users.stream()
            .filter(user -> user.equalsIgnoreCase(expected))
            .findFirst();
    }

    public static void main(String[] args) {
        List<String> users = List.of("Ana", "Bruno", "Carla");
        String result = findUser(users, "bruno").orElse("Usuario no encontrado");
        System.out.println(result);
    }
}`
  },
  {
    id: 'date-range',
    name: 'Java: Fechas y períodos',
    description: 'Calcula días entre fechas con java.time y comprueba si una fecha cae dentro de un intervalo.',
    category: 'Utilidades',
    code: String.raw`import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public class Main {
    public static void main(String[] args) {
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 12, 31);
        LocalDate today = LocalDate.now();

        long days = ChronoUnit.DAYS.between(start, end);
        boolean inside = !today.isBefore(start) && !today.isAfter(end);

        System.out.println("Días entre extremos: " + days);
        System.out.println("Hoy está dentro del período: " + inside);
    }
}`
  },
  {
    id: 'executor-service',
    name: 'Java: Tareas concurrentes seguras',
    description: 'Ejecuta tareas con ExecutorService, recoge Future y cierra el pool incluso si ocurre un error.',
    category: 'Concurrencia',
    code: String.raw`import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class Main {
    public static void main(String[] args) throws InterruptedException, ExecutionException {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Callable<Integer> first = () -> 20 + 22;
            Callable<Integer> second = () -> 10 * 5;
            Future<Integer> a = executor.submit(first);
            Future<Integer> b = executor.submit(second);

            System.out.println("Tarea A: " + a.get());
            System.out.println("Tarea B: " + b.get());
        } finally {
            executor.shutdown();
        }
    }
}`
  },
  {
    id: 'completable-future',
    name: 'Java: CompletableFuture',
    description: 'Encadena operaciones asíncronas, transforma un resultado y gestiona errores de forma explícita.',
    category: 'Concurrencia',
    code: String.raw`import java.util.concurrent.CompletableFuture;

public class Main {
    public static void main(String[] args) {
        CompletableFuture<String> task = CompletableFuture
            .supplyAsync(() -> "catálogo")
            .thenApply(String::toUpperCase)
            .thenApply(value -> "RCC · " + value)
            .exceptionally(error -> "No se pudo completar: " + error.getMessage());

        System.out.println(task.join());
    }
}`
  },
  {
    id: 'graph-bfs',
    name: 'Java: Recorrido BFS de un grafo',
    description: 'Recorre un grafo no ponderado por anchura usando Queue y Set para evitar repetir nodos.',
    category: 'Algoritmos',
    code: String.raw`import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;

public class Main {
    public static void main(String[] args) {
        Map<String, List<String>> graph = Map.of(
            "A", List.of("B", "C"),
            "B", List.of("A", "D"),
            "C", List.of("A", "D"),
            "D", List.of("B", "C", "E"),
            "E", List.of("D")
        );

        Queue<String> queue = new ArrayDeque<>();
        Set<String> visited = new HashSet<>();
        List<String> order = new ArrayList<>();
        queue.offer("A");
        visited.add("A");

        while (!queue.isEmpty()) {
            String node = queue.poll();
            order.add(node);
            for (String neighbor : graph.getOrDefault(node, List.of())) {
                if (visited.add(neighbor)) queue.offer(neighbor);
            }
        }
        System.out.println("Recorrido BFS: " + order);
    }
}`
  },
  {
    id: 'dijkstra-shortest-path',
    name: 'Java: Ruta más corta con Dijkstra',
    description: 'Calcula distancias mínimas en un grafo de pesos no negativos usando PriorityQueue.',
    category: 'Algoritmos',
    code: String.raw`import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;

public class Main {
    record Edge(String to, int weight) {}
    record NodeDistance(String node, int distance) {}

    public static void main(String[] args) {
        Map<String, List<Edge>> graph = new HashMap<>();
        add(graph, "A", "B", 4);
        add(graph, "A", "C", 2);
        add(graph, "C", "B", 1);
        add(graph, "B", "D", 5);
        add(graph, "C", "D", 8);

        Map<String, Integer> distance = new HashMap<>();
        PriorityQueue<NodeDistance> queue =
            new PriorityQueue<>(Comparator.comparingInt(NodeDistance::distance));
        distance.put("A", 0);
        queue.offer(new NodeDistance("A", 0));

        while (!queue.isEmpty()) {
            NodeDistance current = queue.poll();
            if (current.distance() != distance.get(current.node())) continue;

            for (Edge edge : graph.getOrDefault(current.node(), List.of())) {
                int candidate = current.distance() + edge.weight();
                if (candidate < distance.getOrDefault(edge.to(), Integer.MAX_VALUE)) {
                    distance.put(edge.to(), candidate);
                    queue.offer(new NodeDistance(edge.to(), candidate));
                }
            }
        }
        System.out.println("Distancias desde A: " + distance);
    }

    private static void add(Map<String, List<Edge>> graph, String from, String to, int weight) {
        if (weight < 0) throw new IllegalArgumentException("Dijkstra requiere pesos no negativos.");
        graph.computeIfAbsent(from, key -> new ArrayList<>()).add(new Edge(to, weight));
    }
}`
  },
  {
    id: 'merge-sort',
    name: 'Java: Ordenamiento Merge Sort',
    description: 'Implementa Merge Sort con complejidad O(n log n) y mezcla estable de dos mitades ordenadas.',
    category: 'Algoritmos',
    code: String.raw`import java.util.Arrays;

public class Main {
    private static void mergeSort(int[] values) {
        if (values.length < 2) return;
        int middle = values.length / 2;
        int[] left = Arrays.copyOfRange(values, 0, middle);
        int[] right = Arrays.copyOfRange(values, middle, values.length);
        mergeSort(left);
        mergeSort(right);

        int i = 0, j = 0, k = 0;
        while (i < left.length && j < right.length) {
            values[k++] = left[i] <= right[j] ? left[i++] : right[j++];
        }
        while (i < left.length) values[k++] = left[i++];
        while (j < right.length) values[k++] = right[j++];
    }

    public static void main(String[] args) {
        int[] values = {9, 3, 7, 1, 8, 2, 6, 4, 5};
        mergeSort(values);
        System.out.println(Arrays.toString(values));
    }
}`
  },
  {
    id: 'lru-cache',
    name: 'Java: Caché LRU sencilla',
    description: 'Extiende LinkedHashMap para retirar el elemento menos usado al superar una capacidad definida.',
    category: 'Colecciones',
    code: String.raw`import java.util.LinkedHashMap;
import java.util.Map;

public class Main {
    static class LruCache<K, V> extends LinkedHashMap<K, V> {
        private final int capacity;

        LruCache(int capacity) {
            super(capacity, 0.75f, true);
            if (capacity < 1) throw new IllegalArgumentException("Capacidad mínima: 1");
            this.capacity = capacity;
        }

        @Override
        protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
            return size() > capacity;
        }
    }

    public static void main(String[] args) {
        LruCache<String, Integer> cache = new LruCache<>(2);
        cache.put("A", 1);
        cache.put("B", 2);
        cache.get("A");
        cache.put("C", 3);
        System.out.println(cache);
    }
}`
  },
  {
    id: 'properties-config',
    name: 'Java: Configuración con Properties',
    description: 'Carga propiedades desde un texto, aplica valores por defecto y convierte números con validación.',
    category: 'Utilidades',
    code: String.raw`import java.io.StringReader;
import java.util.Properties;

public class Main {
    public static void main(String[] args) throws Exception {
        String configuration = "app.name=RCC\\napp.port=8080\\nfeature.vip=true\\n";
        Properties properties = new Properties();
        properties.load(new StringReader(configuration));

        String appName = properties.getProperty("app.name", "Aplicación");
        int port = Integer.parseInt(properties.getProperty("app.port", "8000"));
        boolean vipEnabled = Boolean.parseBoolean(properties.getProperty("feature.vip", "false"));

        System.out.println("Nombre: " + appName);
        System.out.println("Puerto: " + port);
        System.out.println("VIP activo: " + vipEnabled);
    }
}`
  },
  {
    id: 'immutable-builder',
    name: 'Java: Patrón Builder',
    description: 'Construye un objeto de configuración de manera legible y valida sus campos antes de crear la instancia.',
    category: 'Diseño',
    code: String.raw`public class Main {
    static class Profile {
        final String name;
        final String theme;
        final boolean notifications;

        private Profile(Builder builder) {
            this.name = builder.name;
            this.theme = builder.theme;
            this.notifications = builder.notifications;
        }

        static class Builder {
            private final String name;
            private String theme = "dark";
            private boolean notifications = true;

            Builder(String name) {
                if (name == null || name.isBlank()) throw new IllegalArgumentException("Nombre requerido.");
                this.name = name;
            }

            Builder theme(String value) { this.theme = value; return this; }
            Builder notifications(boolean value) { this.notifications = value; return this; }
            Profile build() { return new Profile(this); }
        }
    }

    public static void main(String[] args) {
        Profile profile = new Profile.Builder("RCC User")
            .theme("graphite")
            .notifications(false)
            .build();
        System.out.println(profile.name + " · " + profile.theme + " · avisos=" + profile.notifications);
    }
}`
  },
  {
    id: 'regex-log-parser',
    name: 'Java: Analizador de registros',
    description: 'Extrae nivel, hora y mensaje de líneas de log usando Pattern y Matcher.',
    category: 'Cadenas',
    code: String.raw`import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Main {
    public static void main(String[] args) {
        Pattern pattern = Pattern.compile("^\\[(INFO|WARN|ERROR)] (\\d{2}:\\d{2}) - (.+)$");
        List<String> logs = List.of(
            "[INFO] 09:30 - Catálogo cargado",
            "[WARN] 09:31 - Imagen no disponible",
            "[ERROR] 09:32 - No se pudo abrir el archivo",
            "línea sin formato"
        );

        for (String line : logs) {
            Matcher matcher = pattern.matcher(line);
            if (matcher.matches()) {
                System.out.printf("%s a las %s: %s%n",
                    matcher.group(1), matcher.group(2), matcher.group(3));
            } else {
                System.out.println("Formato no reconocido: " + line);
            }
        }
    }
}`
  }
];
