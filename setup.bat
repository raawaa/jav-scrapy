@echo off
MD "%APPDATA%\npm\node_modules\jav-scrapy"
MD "%ProgramFiles(x86)%\Jav-scrapy"
copy /y ".gitignore" "%APPDATA%\npm\node_modules\jav-scrapy"
copy /y "actress.js" "%APPDATA%\npm\node_modules\jav-scrapy"
copy /y "jav.js" "%APPDATA%\npm\node_modules\jav-scrapy"
copy /y "package.json" "%APPDATA%\npm\node_modules\jav-scrapy"
copy /y "Jav-scrapy GUI.exe" "%ProgramFiles(x86)%\Jav-scrapy"
copy /y "setup将exe放到%ProgramFiles(x86)%下.bat" "%ProgramFiles(x86)%\Jav-scrapy"
copy /y "uninstall.bat" "%ProgramFiles(x86)%\Jav-scrapy"
copy /y "Jav-scrapy GUI.VisualElementsManifest.xml" "%ProgramFiles(x86)%\Jav-scrapy"
cd /d "%APPDATA%\npm\node_modules\jav-scrapy"
mshta VBScript:Execute("Set a=CreateObject(""WScript.Shell""):Set b=a.CreateShortcut(a.SpecialFolders(""Desktop"") & ""\Jav-scrapy GUI.lnk""):b.TargetPath=""%ProgramFiles(x86)%\Jav-scrapy\Jav-scrapy GUI.exe"":b.WorkingDirectory=""%ProgramFiles(x86)%\jav-scrapy\"":b.Save:close")
npm link
