// Authored, independent Lua examples. No parameter permutations or remote loaders.
// Each entry declares its host context; none claims a live-device verification.
module.exports = {
  fivem: [
    ['coords', 'Coordenadas del jugador', 'cliente', 'Registra /rcccoords e imprime tu posición en la consola F8.', `RegisterCommand('rcccoords', function()
  local p = GetEntityCoords(PlayerPedId())
  print(('Posición: %.3f, %.3f, %.3f'):format(p.x, p.y, p.z))
end, false)`],
    ['heading', 'Orientación del jugador', 'cliente', 'Registra /rccheading para obtener el rumbo en grados.', `RegisterCommand('rccheading', function()
  print(('Rumbo: %.2f grados'):format(GetEntityHeading(PlayerPedId())))
end, false)`],
    ['street', 'Nombre de la calle', 'cliente', 'Registra /rccstreet para consultar la calle actual y su cruce.', `RegisterCommand('rccstreet', function()
  local p = GetEntityCoords(PlayerPedId())
  local street, crossing = GetStreetNameAtCoord(p.x, p.y, p.z)
  print('Calle: ' .. GetStreetNameFromHashKey(street))
  if crossing ~= 0 then print('Cruce: ' .. GetStreetNameFromHashKey(crossing)) end
end, false)`],
    ['zone', 'Zona del mapa', 'cliente', 'Registra /rcczone para mostrar el nombre de la zona.', `RegisterCommand('rcczone', function()
  local p = GetEntityCoords(PlayerPedId())
  local zone = GetNameOfZone(p.x, p.y, p.z)
  print('Zona: ' .. GetLabelText(zone) .. ' (' .. zone .. ')')
end, false)`],
    ['waypoint', 'Distancia al marcador', 'cliente', 'Registra /rccdistance; requiere colocar un destino en el mapa.', `RegisterCommand('rccdistance', function()
  local blip = GetFirstBlipInfoId(8)
  if not DoesBlipExist(blip) then print('Marca un destino en el mapa.'); return end
  local p, target = GetEntityCoords(PlayerPedId()), GetBlipInfoIdCoord(blip)
  local dx, dy = p.x - target.x, p.y - target.y
  print(('Distancia horizontal: %.0f m'):format(math.sqrt(dx*dx + dy*dy)))
end, false)`],
    ['vehicle-report', 'Informe del vehículo', 'cliente', 'Registra /rccvehicle e informa de matrícula, motor y carrocería.', `RegisterCommand('rccvehicle', function()
  local vehicle = GetVehiclePedIsIn(PlayerPedId(), false)
  if vehicle == 0 then print('Entra en un vehículo.'); return end
  print('Matrícula: ' .. GetVehicleNumberPlateText(vehicle))
  print(('Motor: %.0f | Carrocería: %.0f'):format(GetVehicleEngineHealth(vehicle), GetVehicleBodyHealth(vehicle)))
end, false)`],
    ['speed', 'Velocidad en km/h', 'cliente', 'Registra /rccspeed para consultar la velocidad del vehículo actual.', `RegisterCommand('rccspeed', function()
  local vehicle = GetVehiclePedIsIn(PlayerPedId(), false)
  if vehicle == 0 then print('Entra en un vehículo.'); return end
  print(('Velocidad: %.1f km/h'):format(GetEntitySpeed(vehicle) * 3.6))
end, false)`],
    ['seat', 'Asiento ocupado', 'cliente', 'Registra /rccseat para identificar el asiento del jugador.', `RegisterCommand('rccseat', function()
  local ped = PlayerPedId()
  local vehicle = GetVehiclePedIsIn(ped, false)
  if vehicle == 0 then print('No estás en un vehículo.'); return end
  for seat = -1, GetVehicleMaxNumberOfPassengers(vehicle) - 1 do
    if GetPedInVehicleSeat(vehicle, seat) == ped then
      print(seat == -1 and 'Conductor' or ('Pasajero, asiento ' .. seat)); return
    end
  end
end, false)`],
    ['clock', 'Reloj del mundo', 'cliente', 'Registra /rccclock para consultar la hora del juego.', `RegisterCommand('rccclock', function()
  print(('Hora del mundo: %02d:%02d:%02d'):format(GetClockHours(), GetClockMinutes(), GetClockSeconds()))
end, false)`],
    ['interior', 'Identificador del interior', 'cliente', 'Registra /rccinterior y detecta si estás dentro de un interior.', `RegisterCommand('rccinterior', function()
  local interior = GetInteriorFromEntity(PlayerPedId())
  print(interior == 0 and 'Exterior' or ('Interior: ' .. interior))
end, false)`],
    ['nearest-vehicle', 'Vehículo cercano', 'cliente', 'Registra /rccnearcar para localizar un vehículo a menos de 15 metros.', `RegisterCommand('rccnearcar', function()
  local p = GetEntityCoords(PlayerPedId())
  local vehicle = GetClosestVehicle(p.x, p.y, p.z, 15.0, 0, 70)
  if vehicle == 0 then print('Sin vehículo cercano.'); return end
  print('Vehículo cercano: ' .. GetVehicleNumberPlateText(vehicle))
end, false)`],
    ['route', 'Ruta al aeropuerto', 'cliente', 'Registra /rccairport para marcar el aeropuerto de Los Santos en el mapa.', `RegisterCommand('rccairport', function()
  SetNewWaypoint(-1037.0, -2737.0)
  print('Destino marcado: aeropuerto de Los Santos.')
end, false)`],
    ['online', 'Jugadores conectados', 'servidor', 'Registra /rcconline para listar en la consola los jugadores conectados.', `RegisterCommand('rcconline', function()
  local players = GetPlayers()
  print(('Conectados: %d'):format(#players))
  for _, id in ipairs(players) do print(id .. ': ' .. (GetPlayerName(id) or 'Sin nombre')) end
end, true)`],
    ['ping', 'Consulta de latencia', 'servidor', 'Registra /rccping [id] e imprime la latencia del jugador en la consola del servidor.', `RegisterCommand('rccping', function(source, args)
  local id = tonumber(args[1]) or source
  if id <= 0 or not GetPlayerName(id) then print('Indica un ID conectado.'); return end
  print(('%s: %d ms'):format(GetPlayerName(id), GetPlayerPing(id)))
end, true)`],
    ['join-log', 'Registro de conexiones', 'servidor', 'Registra la entrada de cada jugador en la consola del servidor.', `AddEventHandler('playerJoining', function()
  local id = source
  print(('[RCC] Conectado: %s (ID %s)'):format(GetPlayerName(id) or 'Sin nombre', tostring(id)))
end)`],
    ['leave-log', 'Registro de desconexiones', 'servidor', 'Registra las desconexiones y su motivo en la consola del servidor.', `AddEventHandler('playerDropped', function(reason)
  local id = source
  print(('[RCC] Desconexión %s: %s'):format(tostring(id), tostring(reason)))
end)`],
    ['resource-list', 'Lista de recursos activos', 'servidor', 'Registra /rccresources para listar los recursos iniciados.', `RegisterCommand('rccresources', function()
  for i = 0, GetNumResources() - 1 do
    local name = GetResourceByFindIndex(i)
    if name and GetResourceState(name) == 'started' then print(name) end
  end
end, true)`],
    ['announce', 'Anuncio con permiso ACE', 'servidor', 'Registra /rccannounce mensaje; requiere el recurso chat y permiso command.rccannounce.', `RegisterCommand('rccannounce', function(source, args)
  local message = table.concat(args, ' '):sub(1, 200)
  if message == '' then print('Uso: rccannounce mensaje'); return end
  TriggerClientEvent('chat:addMessage', -1, {args = {'Anuncio', message}})
end, true)`],
    ['uptime', 'Tiempo activo del recurso', 'servidor', 'Registra /rccuptime para consultar cuánto tiempo lleva activo este recurso.', `local started = os.time()
RegisterCommand('rccuptime', function()
  local seconds = math.max(0, os.time() - started)
  print(('Activo: %02dh %02dm %02ds'):format(math.floor(seconds/3600), math.floor(seconds/60)%60, seconds%60))
end, true)`],
    ['resource-log', 'Diagnóstico de inicio y parada', 'servidor', 'Registra en consola el arranque y la parada del recurso que contiene este archivo.', `local ownResource = GetCurrentResourceName()
AddEventHandler('onResourceStart', function(name)
  if name == ownResource then print('[RCC] Recurso iniciado: ' .. name) end
end)
AddEventHandler('onResourceStop', function(name)
  if name == ownResource then print('[RCC] Recurso detenido: ' .. name) end
end)`]
  ],
  gameguardian: [
    ['target', 'Información del proceso', 'Android', 'Muestra el paquete y la arquitectura del proceso seleccionado.', `local info = gg.getTargetInfo()
if not info then gg.alert('Selecciona un proceso primero.'); return end
gg.alert(('Paquete: %s\\nArquitectura: %s'):format(info.packageName or 'Desconocido', info.x64 and '64 bits' or '32 bits'))`],
    ['version', 'Versión de GameGuardian', 'Android', 'Consulta la versión instalada y su número de compilación.', `gg.alert(('GameGuardian %s\\nCompilación: %s'):format(tostring(gg.VERSION), tostring(gg.BUILD)))`],
    ['search-int', 'Búsqueda de enteros DWORD', 'Android', 'Solicita un entero y busca coincidencias en el proceso seleccionado; no modifica memoria.', `local answer = gg.prompt({'Entero DWORD a buscar'}, {'100'}, {'number'})
if not answer then return end
local value = tonumber(answer[1])
if not value or value ~= math.floor(value) or value < -2147483648 or value > 2147483647 then gg.alert('Entero DWORD fuera de rango.'); return end
gg.clearResults()
gg.searchNumber(tostring(value), gg.TYPE_DWORD)
gg.alert('Coincidencias: ' .. gg.getResultsCount())`],
    ['search-float', 'Búsqueda de decimales', 'Android', 'Busca un valor FLOAT introducido por el usuario sin escribir en memoria.', `local answer = gg.prompt({'Decimal FLOAT a buscar'}, {'1.5'}, {'number'})
if not answer or not tonumber(answer[1]) then return end
gg.clearResults()
gg.searchNumber(answer[1], gg.TYPE_FLOAT)
gg.alert('Resultados FLOAT: ' .. gg.getResultsCount())`],
    ['refine', 'Refinar resultados DWORD', 'Android', 'Filtra una búsqueda DWORD previa por el valor actual.', `if gg.getResultsCount() == 0 then gg.alert('Realiza primero una búsqueda DWORD.'); return end
local answer = gg.prompt({'Nuevo valor entero'}, {'100'}, {'number'})
if not answer then return end
local value = tonumber(answer[1])
if not value or value ~= math.floor(value) or value < -2147483648 or value > 2147483647 then gg.alert('Entero DWORD fuera de rango.'); return end
gg.refineNumber(tostring(value), gg.TYPE_DWORD)
gg.alert('Resultados restantes: ' .. gg.getResultsCount())`],
    ['count', 'Contador de resultados', 'Android', 'Consulta cuántos resultados contiene la búsqueda actual.', `local count = gg.getResultsCount()
gg.alert(count == 0 and 'La búsqueda actual está vacía.' or ('Resultados actuales: ' .. count))`],
    ['preview', 'Vista previa de resultados', 'Android', 'Muestra las primeras diez direcciones y sus valores.', `local results = gg.getResults(10)
if #results == 0 then gg.alert('Sin resultados.'); return end
local lines = {}
for i, item in ipairs(results) do
  lines[i] = ('0x%X = %s'):format(item.address, tostring(item.value))
end
gg.alert(table.concat(lines, '\\n'))`],
    ['clear', 'Limpiar búsqueda con confirmación', 'Android', 'Elimina los resultados de búsqueda sin alterar la memoria del proceso.', `if gg.alert('¿Limpiar los resultados de búsqueda?', 'Limpiar', 'Cancelar') == 1 then
  gg.clearResults()
  gg.toast('Búsqueda vacía')
end`],
    ['ranges', 'Seleccionar región de búsqueda', 'Android', 'Permite elegir entre memoria anónima, C heap y C alloc para búsquedas posteriores.', `local choice = gg.choice({'Anónima', 'C heap', 'C alloc'}, nil, 'Región de búsqueda')
if not choice then return end
local ranges = {gg.REGION_ANONYMOUS, gg.REGION_C_HEAP, gg.REGION_C_ALLOC}
gg.setRanges(ranges[choice])
gg.toast('Región seleccionada para las próximas búsquedas')`],
    ['maps', 'Resumen de regiones de memoria', 'Android', 'Lista hasta veinte regiones del proceso con sus direcciones iniciales.', `local ranges = gg.getRangesList()
local lines = {'Regiones: ' .. #ranges}
for i = 1, math.min(20, #ranges) do
  local item = ranges[i]
  lines[#lines + 1] = ('0x%X %s'):format(item.start, item.name or '')
end
gg.alert(table.concat(lines, '\\n'))`],
    ['library', 'Buscar biblioteca cargada', 'Android', 'Busca por nombre una biblioteca cargada y muestra su dirección base.', `local answer = gg.prompt({'Nombre de biblioteca, por ejemplo libil2cpp.so'}, {''}, {'text'})
if not answer or answer[1] == '' then return end
local matches = gg.getRangesList(answer[1])
if #matches == 0 then gg.alert('Biblioteca no encontrada.'); return end
gg.alert(('Coincidencias: %d\\nPrimera región: 0x%X'):format(#matches, matches[1].start))`],
    ['copy-addresses', 'Copiar direcciones de resultados', 'Android', 'Copia al portapapeles hasta cien direcciones de la búsqueda actual.', `local results = gg.getResults(100)
if #results == 0 then gg.alert('Sin resultados para copiar.'); return end
local lines = {}
for i, item in ipairs(results) do lines[i] = ('0x%X'):format(item.address) end
gg.copyText(table.concat(lines, '\\n'))
gg.toast('Direcciones copiadas: ' .. #lines)`],
    ['goto', 'Abrir dirección en el editor', 'Android', 'Valida una dirección hexadecimal y abre esa ubicación sin modificar valores.', `local answer = gg.prompt({'Dirección hexadecimal (sin 0x)'}, {''}, {'text'})
if not answer then return end
local hex = answer[1]:gsub('^0[xX]', '')
local address = hex:match('^[%da-fA-F]+$') and tonumber(hex, 16)
if not address or address <= 0 then gg.alert('Dirección inválida.'); return end
gg.gotoAddress(address)
gg.setVisible(true)`],
    ['bookmark', 'Añadir resultados a la lista', 'Android', 'Añade hasta veinte resultados a la lista guardada sin congelarlos ni escribir valores.', `local items = gg.getResults(20)
if #items == 0 then gg.alert('Sin resultados.'); return end
for i, item in ipairs(items) do
  item.name = 'RCC resultado ' .. i
  item.freeze = false
end
gg.addListItems(items)
gg.toast('Añadidos a la lista: ' .. #items)`],
    ['saved-preview', 'Consultar lista guardada', 'Android', 'Muestra hasta quince elementos de la lista y su estado de congelación.', `local items = gg.getListItems()
local lines = {'Elementos guardados: ' .. #items}
for i = 1, math.min(15, #items) do
  local item = items[i]
  lines[#lines + 1] = ('%s | 0x%X | %s'):format(item.name or '', item.address, item.freeze and 'Congelado' or 'Libre')
end
gg.alert(table.concat(lines, '\\n'))`],
    ['read-address', 'Leer un DWORD por dirección', 'Android', 'Solicita una dirección hexadecimal y lee su valor DWORD actual.', `local answer = gg.prompt({'Dirección hexadecimal (sin 0x)'}, {''}, {'text'})
if not answer then return end
local hex = answer[1]:gsub('^0[xX]', '')
local address = hex:match('^[%da-fA-F]+$') and tonumber(hex, 16)
if not address or address <= 0 then gg.alert('Dirección inválida.'); return end
local values = gg.getValues({{address = address, flags = gg.TYPE_DWORD}})
gg.alert('Valor DWORD: ' .. tostring(values[1].value))`],
    ['select-results', 'Cargar lista como resultados', 'Android', 'Permite elegir elementos guardados y cargarlos como resultados de búsqueda.', `local items = gg.getListItems()
if #items == 0 then gg.alert('La lista está vacía.'); return end
local labels = {}
for i, item in ipairs(items) do labels[i] = ('0x%X %s'):format(item.address, item.name or '') end
local chosen = gg.multiChoice(labels, nil, 'Cargar como resultados')
if not chosen then return end
local results = {}
for i in ipairs(items) do if chosen[i] then results[#results + 1] = items[i] end end
if #results > 0 then gg.loadResults(results); gg.toast('Resultados cargados: ' .. #results) end`],
    ['range-mask', 'Consultar máscara de regiones', 'Android', 'Muestra la máscara numérica de las regiones activas para búsqueda.', `local mask = gg.getRanges()
gg.alert(('Máscara de regiones activa: %s\\nHexadecimal: 0x%X'):format(tostring(mask), mask))`],
    ['refresh', 'Actualizar valores de resultados', 'Android', 'Vuelve a leer hasta veinte direcciones y carga sus valores actuales como resultados.', `local results = gg.getResults(20)
if #results == 0 then gg.alert('Sin resultados para actualizar.'); return end
local values = gg.getValues(results)
gg.loadResults(values)
gg.toast('Valores actualizados: ' .. #values)`],
    ['unbookmark', 'Quitar un elemento de la lista', 'Android', 'Permite elegir y eliminar un elemento de la lista guardada tras confirmar.', `local items = gg.getListItems()
if #items == 0 then gg.alert('La lista está vacía.'); return end
local labels = {}
for i, item in ipairs(items) do labels[i] = ('0x%X %s'):format(item.address, item.name or '') end
local choice = gg.choice(labels, nil, 'Quitar elemento guardado')
if choice and gg.alert('¿Quitar este elemento de la lista?', 'Quitar', 'Cancelar') == 1 then
  gg.removeListItems({items[choice]})
  gg.toast('Elemento retirado')
end`]
  ],
  autotouch: [
    ['center-tap', 'Toque en el centro', 'iOS', 'Espera dos segundos y toca el centro de la pantalla actual.', `local width, height = getScreenResolution()
usleep(2000000)
local x, y = math.floor(width/2), math.floor(height/2)
touchDown(0, x, y)
usleep(50000)
touchUp(0, x, y)`],
    ['double-tap', 'Doble toque', 'iOS', 'Realiza dos toques en el centro con una pausa de 120 milisegundos.', `local w, h = getScreenResolution()
local x, y = math.floor(w/2), math.floor(h/2)
usleep(2000000)
for i = 1, 2 do
  touchDown(0, x, y); usleep(50000); touchUp(0, x, y)
  if i == 1 then usleep(120000) end
end`],
    ['long-press', 'Pulsación prolongada', 'iOS', 'Mantiene un dedo en el centro durante 1,2 segundos.', `local w, h = getScreenResolution()
local x, y = math.floor(w/2), math.floor(h/2)
usleep(2000000)
touchDown(0, x, y)
usleep(1200000)
touchUp(0, x, y)`],
    ['scroll', 'Desplazamiento vertical', 'iOS', 'Desliza desde el 75 % al 25 % de la altura para desplazar una página.', `local w, h = getScreenResolution()
local x, startY, endY = math.floor(w/2), math.floor(h*0.75), math.floor(h*0.25)
usleep(2000000)
touchDown(0, x, startY)
for i = 1, 20 do
  touchMove(0, x, math.floor(startY + (endY-startY)*i/20)); usleep(20000)
end
touchUp(0, x, endY)`],
    ['horizontal', 'Deslizamiento horizontal', 'iOS', 'Desliza hacia la izquierda por el centro de la pantalla.', `local w, h = getScreenResolution()
local x1, x2, y = math.floor(w*0.8), math.floor(w*0.2), math.floor(h/2)
usleep(2000000)
touchDown(0, x1, y)
for i = 1, 18 do touchMove(0, math.floor(x1+(x2-x1)*i/18), y); usleep(20000) end
touchUp(0, x2, y)`],
    ['drag', 'Arrastrar un elemento', 'iOS', 'Mantiene pulsado un punto y lo arrastra hasta otro; ajusta las coordenadas al elemento.', `local w, h = getScreenResolution()
local x, y1, y2 = math.floor(w*0.3), math.floor(h*0.35), math.floor(h*0.65)
usleep(2000000)
touchDown(0, x, y1); usleep(800000)
for i = 1, 30 do touchMove(0, x, math.floor(y1+(y2-y1)*i/30)); usleep(20000) end
touchUp(0, x, y2)`],
    ['pinch', 'Gesto de pellizco', 'iOS', 'Acerca dos dedos para reducir el zoom en una app que admita ese gesto.', `local w, h = getScreenResolution()
local y = math.floor(h/2)
usleep(2000000)
touchDown(0, math.floor(w*0.2), y); touchDown(1, math.floor(w*0.8), y)
for i = 1, 20 do
  touchMove(0, math.floor(w*(0.2+0.2*i/20)), y)
  touchMove(1, math.floor(w*(0.8-0.2*i/20)), y); usleep(25000)
end
touchUp(0, math.floor(w*0.4), y); touchUp(1, math.floor(w*0.6), y)`],
    ['zoom', 'Ampliación con dos dedos', 'iOS', 'Separa dos dedos desde el centro para ampliar una imagen o mapa.', `local w, h = getScreenResolution()
local y = math.floor(h/2)
usleep(2000000)
touchDown(0, math.floor(w*0.4), y); touchDown(1, math.floor(w*0.6), y)
for i = 1, 20 do
  touchMove(0, math.floor(w*(0.4-0.25*i/20)), y)
  touchMove(1, math.floor(w*(0.6+0.25*i/20)), y); usleep(25000)
end
touchUp(0, math.floor(w*0.15), y); touchUp(1, math.floor(w*0.85), y)`],
    ['two-finger-tap', 'Toque con dos dedos', 'iOS', 'Toca dos puntos simultáneamente; útil para comprobar gestos multitáctiles.', `local w, h = getScreenResolution()
local x1, x2, y = math.floor(w*0.35), math.floor(w*0.65), math.floor(h/2)
usleep(2000000)
touchDown(0, x1, y); touchDown(1, x2, y)
usleep(80000)
touchUp(0, x1, y); touchUp(1, x2, y)`],
    ['type', 'Escribir texto en un campo', 'iOS', 'Tras tres segundos, escribe una frase en el campo que tenga el foco.', `-- Selecciona antes un campo de texto en la app de destino.
usleep(3000000)
inputText('Prueba de escritura con AutoTouch')`],
    ['home', 'Volver a la pantalla de inicio', 'iOS', 'Simula una pulsación de Home mediante la API de teclas de AutoTouch.', `usleep(1000000)
keyDown(KEY_TYPE.HOME_BUTTON)
usleep(100000)
keyUp(KEY_TYPE.HOME_BUTTON)`],
    ['safari', 'Abrir Safari', 'iOS', 'Abre Safari mediante su identificador de aplicación.', `appRun('com.apple.mobilesafari')
usleep(1500000)
toast('Safari abierto')`],
    ['restart-safari', 'Reiniciar Safari', 'iOS', 'Cierra Safari y vuelve a abrirlo; puede interrumpir una sesión en curso.', `appKill('com.apple.mobilesafari')
usleep(800000)
appRun('com.apple.mobilesafari')
usleep(1500000)
toast('Safari reiniciado')`],
    ['screen', 'Consultar resolución', 'iOS', 'Muestra las dimensiones de pantalla que devuelve AutoTouch.', `local width, height = getScreenResolution()
alert(('Resolución: %d × %d\\nOrientación: %s'):format(width, height, width > height and 'Horizontal' or 'Vertical'))`],
    ['pixel', 'Inspeccionar el color central', 'iOS', 'Lee el píxel central y muestra su color hexadecimal.', `local w, h = getScreenResolution()
local color = getColor(math.floor(w/2), math.floor(h/2))
alert(('Color central: #%06X'):format(color))`],
    ['wait-color', 'Esperar un color con límite', 'iOS', 'Espera hasta diez segundos a que el centro coincida con el color configurado, con tolerancia RGB.', `local w, h = getScreenResolution()
local target, tolerance = 0xFFFFFF, 12 -- Ajusta el color esperado.
local function channel(color, shift) return math.floor(color / 2^shift) % 256 end
for attempt = 1, 40 do
  local color, matches = getColor(math.floor(w/2), math.floor(h/2)), true
  for _, shift in ipairs({16, 8, 0}) do
    if math.abs(channel(color, shift)-channel(target, shift)) > tolerance then matches = false end
  end
  if matches then toast('Color detectado'); return end
  usleep(250000)
end
toast('Tiempo de espera agotado')`],
    ['change', 'Detectar cambio de pantalla', 'iOS', 'Compara el píxel central durante cinco segundos y avisa cuando cambia.', `local w, h = getScreenResolution()
local x, y = math.floor(w/2), math.floor(h/2)
local initial = getColor(x, y)
for attempt = 1, 20 do
  usleep(250000)
  if getColor(x, y) ~= initial then toast('Cambio detectado en el centro'); return end
end
toast('El píxel central no cambió')`],
    ['grid-colors', 'Muestrear una cuadrícula de colores', 'iOS', 'Lee nueve puntos de la pantalla y muestra sus colores sin ejecutar toques.', `local w, h = getScreenResolution()
local lines = {}
for row = 1, 3 do
  for col = 1, 3 do
    local x, y = math.floor(w*col/4), math.floor(h*row/4)
    lines[#lines+1] = ('(%d, %d): #%06X'):format(x, y, getColor(x, y))
  end
end
alert(table.concat(lines, '\\n'))`],
    ['circle', 'Dibujar un círculo táctil', 'iOS', 'Traza un círculo en el centro; abre antes una app de dibujo.', `local w, h = getScreenResolution()
local cx, cy, radius = math.floor(w/2), math.floor(h/2), math.floor(math.min(w,h)*0.2)
usleep(3000000)
touchDown(0, cx+radius, cy)
for step = 1, 60 do
  local angle = step*2*math.pi/60
  touchMove(0, math.floor(cx+radius*math.cos(angle)), math.floor(cy+radius*math.sin(angle)))
  usleep(16000)
end
touchUp(0, cx+radius, cy)`],
    ['conditional-tap', 'Toque condicionado por color', 'iOS', 'Toca el centro solo si su color coincide con el color configurado; evita tocar en caso contrario.', `local expected = 0xFFFFFF -- Sustituye por el color del control de destino.
local w, h = getScreenResolution()
local x, y = math.floor(w/2), math.floor(h/2)
usleep(2000000)
if getColor(x, y) ~= expected then toast('Color distinto: no se ejecuta el toque'); return end
touchDown(0, x, y); usleep(50000); touchUp(0, x, y)
toast('Toque ejecutado')`]
  ]
};
