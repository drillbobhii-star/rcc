// Reproducible Studio presets: 4 layouts × 8 palettes × 8 transitions × 8 corner sizes.
// These are 2,048 configurable variants of one UI recipe, not distinct game mechanics.
const fs = require('node:fs');
const catalog = JSON.parse(fs.readFileSync('scripts.json','utf8')).filter(s => !s.id.startsWith('rcc_recipe_glass_'));
const layouts = [['compacto',280,160],['panoramico',420,180],['vertical',260,340],['cuadrado',320,320]];
const colors = [['azul',24,56,90],['grafito',30,34,42],['oceano',20,65,77],['pizarra',50,62,78],['bosque',25,62,50],['cobre',75,47,34],['vino',63,34,48],['hielo',75,98,116]];
const transitions = [['suave','Sine',0.25],['rebote','Bounce',0.5],['elastico','Elastic',0.65],['cuadratico','Quad',0.3],['cubico','Cubic',0.4],['circular','Circular',0.35],['exponencial','Exponential',0.45],['retroceso','Back',0.55]];
for(const [layout,width,height] of layouts) for(const [palette,r,g,b] of colors) for(const [motion,easing,duration] of transitions) for(const radius of [0,4,8,12,16,20,24,32]) {
  const id = `rcc_recipe_glass_${layout}_${palette}_${motion}_${radius}`;
  const name = `Panel glass ${palette} · ${layout} · ${motion} · radio ${radius}`;
  const code = `-- RCC | ${name}
-- LocalScript en StarterPlayer > StarterPlayerScripts de tu propio juego.
-- Variante configurable: misma receta de interfaz; cambia tamaño, color y transición.
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local playerGui = Players.LocalPlayer:WaitForChild("PlayerGui")
local previous = playerGui:FindFirstChild("RCCGlassDemo")
if previous then previous:Destroy() end
local gui = Instance.new("ScreenGui")
gui.Name = "RCCGlassDemo"
gui.ResetOnSpawn = false
gui.Parent = playerGui
local panel = Instance.new("Frame")
panel.AnchorPoint = Vector2.new(0.5, 0.5)
panel.Position = UDim2.fromScale(0.5, 0.5)
panel.Size = UDim2.fromOffset(${width}, ${height})
panel.BackgroundColor3 = Color3.fromRGB(${r}, ${g}, ${b})
panel.BackgroundTransparency = 0.22
panel.Parent = gui
local scale = Instance.new("UIScale")
scale.Parent = panel
local camera = workspace.CurrentCamera
local function fit()
  if camera then scale.Scale = math.min(1, (camera.ViewportSize.X - 32) / ${width}, (camera.ViewportSize.Y - 32) / ${height}) end
end
if camera then camera:GetPropertyChangedSignal("ViewportSize"):Connect(fit) end
fit()
local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, ${radius})
corner.Parent = panel
local border = Instance.new("UIStroke")
border.Color = Color3.fromRGB(220, 235, 255)
border.Transparency = 0.65
border.Parent = panel
local label = Instance.new("TextLabel")
label.Size = UDim2.new(1, -32, 0.55, 0)
label.Position = UDim2.fromOffset(16, 12)
label.BackgroundTransparency = 1
label.Text = "RCC / ${palette} / ${motion}"
label.TextColor3 = Color3.fromRGB(240, 246, 255)
label.TextWrapped = true
label.Font = Enum.Font.GothamBold
label.TextSize = 18
label.Parent = panel
local button = Instance.new("TextButton")
button.Size = UDim2.new(1, -32, 0, 42)
button.Position = UDim2.new(0, 16, 1, -58)
button.Text = "Cambiar cristal"
button.BackgroundColor3 = Color3.fromRGB(220, 235, 255)
button.TextColor3 = Color3.fromRGB(24, 34, 48)
button.Parent = panel
local active, tween = false, nil
button.Activated:Connect(function()
  active = not active
  if tween then tween:Cancel() end
  tween = TweenService:Create(panel, TweenInfo.new(${duration}, Enum.EasingStyle.${easing}, Enum.EasingDirection.Out), {BackgroundTransparency = active and 0.65 or 0.22})
  tween:Play()
  button.Text = active and "Restaurar cristal" or "Cambiar cristal"
end)
`;
  catalog.push({id,name,description:`Variante configurable de la receta de panel RCC: distribución ${layout} de ${width} × ${height}, paleta ${palette} RGB(${r}, ${g}, ${b}), transición ${easing} de ${duration}s y esquinas de ${radius}px. Crea una interfaz adaptable y un botón que alterna la transparencia; no modifica juegos ajenos.`,level:'free',device:'both',platform:'roblox',type:'source',executors:['Roblox Studio (cliente)'],tags:['Original RCC','Variantes configurables','Interfaz glass',palette,motion],version:'1.0.0',created_at:'2026-10-30',code,
    compatibility:{environment:'client',runtime:'Luau / Roblox Studio',context:'LocalScript en StarterPlayer > StarterPlayerScripts de tu propia experiencia.',requirements:'Roblox Studio. Probar con Play para disponer de LocalPlayer. No requiere llave ni dependencias remotas.',verification:'syntax-only',executor_status:'not-applicable',test_details:'Receta generada de forma reproducible; estructura revisada. Sin prueba de ejecución en Roblox Studio.',mobile_status:'Botón Activated para ratón y tacto; escala según la cámara. Sin prueba en dispositivo.',sources:['https://create.roblox.com/docs/reference/engine/classes/TweenService','https://create.roblox.com/docs/reference/engine/classes/ScreenGui']}});
}
fs.writeFileSync('scripts.json',JSON.stringify(catalog,null,2)+'\n');
fs.writeFileSync('netlify/functions/lib/catalog-ids.json',JSON.stringify(catalog.map(s=>s.id))+'\n');
console.log('Added 2048 clearly labeled glass recipe variants; total:',catalog.length);
