allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)

    // Automatically patch legacy plugins for AGP 9
    val bf = project.buildFile
    if (bf.exists()) {
        try {
            var content = bf.readText()
            var modified = false
            if (content.contains("proguard-android.txt")) {
                content = content.replace("proguard-android.txt", "proguard-android-optimize.txt")
                modified = true
            }
            if (content.contains("agpMajor < 9")) {
                content = content.replace("agpMajor < 9", "true")
                modified = true
            }
            if (content.contains("JavaVersion.VERSION_1_8")) {
                content = content.replace("JavaVersion.VERSION_1_8", "JavaVersion.VERSION_17")
                modified = true
            }
            if (modified) {
                bf.writeText(content)
            }
        } catch (_: Exception) {}
    }
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
