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
}
subprojects {
    project.evaluationDependsOn(":app")
    fun forceJava17() {
        try {
            @Suppress("DEPRECATION")
            extensions.configure<com.android.build.gradle.LibraryExtension> {
                compileOptions {
                    sourceCompatibility = JavaVersion.VERSION_17
                    targetCompatibility = JavaVersion.VERSION_17
                }
            }
        } catch (_: Exception) {}
        try {
            extensions.configure<com.android.build.api.dsl.LibraryExtension> {
                compileOptions {
                    sourceCompatibility = JavaVersion.VERSION_17
                    targetCompatibility = JavaVersion.VERSION_17
                }
            }
        } catch (_: Exception) {}
    }
    pluginManager.withPlugin("com.android.library") {
        forceJava17()
    }
    if (project.path != ":app") {
        project.afterEvaluate {
            try { forceJava17() } catch (_: Exception) {}
        }
    }
    tasks.configureEach {
        if (this is org.jetbrains.kotlin.gradle.tasks.KotlinCompile) {
            compilerOptions.jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
