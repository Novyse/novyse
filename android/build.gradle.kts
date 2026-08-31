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

    // Automatically patch legacy plugins still referencing proguard-android.txt for AGP 9
    val bf = project.buildFile
    if (bf.exists()) {
        try {
            val content = bf.readText()
            if (content.contains("proguard-android.txt")) {
                bf.writeText(content.replace("proguard-android.txt", "proguard-android-optimize.txt"))
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
