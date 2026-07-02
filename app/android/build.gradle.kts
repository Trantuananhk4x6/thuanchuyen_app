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
    // Force-raise compileSdk on plugin subprojects that hardcode an older value
    // (e.g. geocoding_android pins `compileSdk 33`, too low for its androidx deps).
    // Must run in afterEvaluate so it overrides the plugin's own android{} block
    // (a plugins.withType callback runs too early and gets overwritten). Skip ":app":
    // evaluationDependsOn above already forces it to evaluate, and registering
    // afterEvaluate on an already-evaluated project throws — and :app is already 36.
    if (path != ":app") {
        afterEvaluate {
            extensions.findByType<com.android.build.gradle.BaseExtension>()?.apply {
                compileSdkVersion(36)
            }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
