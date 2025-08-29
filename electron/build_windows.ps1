Set-Location ..

& npx expo export -p web

# Clear the webapp directory before copying
if (Test-Path electron\webapp) {
    Remove-Item -Recurse -Force electron\webapp\*
}

Copy-Item -Recurse -Force dist\* electron\webapp\

if (Test-Path electron\assets) {
    Remove-Item -Recurse -Force electron\assets\*
}

Copy-Item -Recurse -Force assets\* electron\assets\

Set-Location electron

& npm run build:win