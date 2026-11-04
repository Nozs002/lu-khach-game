param([int]$Port = 8080, [string]$BindAddress = '127.0.0.1', [switch]$BuildOnly)
$ErrorActionPreference = 'Stop'
$serverRoot = $PSScriptRoot
$jdk = $env:JAVA_HOME
if (-not $jdk) {
    $javaCommand = Get-Command javac -ErrorAction SilentlyContinue
    if ($javaCommand) { $jdk = Split-Path (Split-Path $javaCommand.Source) }
    elseif (Test-Path 'C:\Program Files\Java\jdk-17\bin\javac.exe') { $jdk = 'C:\Program Files\Java\jdk-17' }
    else { throw 'Install JDK 17+ and set JAVA_HOME.' }
}
$dependencies = Join-Path $serverRoot '.deps'
$classes = Join-Path $serverRoot 'target/classes'
New-Item -ItemType Directory -Force $dependencies, $classes | Out-Null
$artifacts = @(
    'org/java-websocket/Java-WebSocket/1.6.0/Java-WebSocket-1.6.0',
    'com/google/code/gson/gson/2.13.2/gson-2.13.2',
    'org/slf4j/slf4j-api/2.0.16/slf4j-api-2.0.16',
    'org/slf4j/slf4j-simple/2.0.16/slf4j-simple-2.0.16'
)
foreach ($artifact in $artifacts) {
    $jar = Join-Path $dependencies ((Split-Path $artifact -Leaf) + '.jar')
    if (-not (Test-Path $jar)) {
        $download = "$jar.part"
        Invoke-WebRequest "https://repo.maven.apache.org/maven2/$artifact.jar" -OutFile $download
        Move-Item -LiteralPath $download -Destination $jar -Force
    }
}
$sources = @(Get-ChildItem (Join-Path $serverRoot 'src/main/java') -Recurse -Filter '*.java' | ForEach-Object FullName)
& (Join-Path $jdk 'bin/javac.exe') --release 17 -encoding UTF-8 -cp "$dependencies/*" -d $classes @sources
if ($LASTEXITCODE -ne 0) { throw 'Java compilation failed.' }
if (-not $BuildOnly) {
    & (Join-Path $jdk 'bin/java.exe') -cp "$classes;$dependencies/*" vn.btl.ltm.GameServer $Port $BindAddress (Join-Path $serverRoot 'maps/world_server.json')
    if ($LASTEXITCODE -ne 0) { throw 'Server exited with an error.' }
}
