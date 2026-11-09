import argparse
import json
import math
import sys
import time
from pathlib import Path


def parse_args(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("--glb", required=True)
    parser.add_argument("--camera", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--width", type=int, required=True)
    parser.add_argument("--height", type=int, required=True)
    parser.add_argument("--samples", type=int, required=True)
    parser.add_argument("--device", choices=["GPU", "CPU"], default="CPU")
    parser.add_argument("--denoise", action="store_true")
    return parser.parse_args(argv)


def hex_to_linear_rgb(hex_str: str):
    h = hex_str.lstrip("#")
    if len(h) != 6:
        return (0.05, 0.05, 0.05, 1.0)
    vals = []
    for i in (0, 2, 4):
        c = int(h[i : i + 2], 16) / 255.0
        lin = c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
        vals.append(lin)
    return (vals[0], vals[1], vals[2], 1.0)


def main():
    t0 = time.perf_counter()
    try:
        import bpy  # type: ignore

        argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
        args = parse_args(argv)

        glb_path = Path(args.glb).resolve()
        cam_path = Path(args.camera).resolve()
        out_path = Path(args.out).resolve()

        if not glb_path.is_file():
            raise RuntimeError(f"glb not found: {glb_path}")
        raw_bytes = glb_path.read_bytes()
        if len(raw_bytes) < 12 or raw_bytes[:4] != b"glTF":
            raise RuntimeError("invalid glb header")

        cam_json = json.loads(cam_path.read_text(encoding="utf-8"))

        # 1. Clear scene and import glTF
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(glb_path))

        # 2. Camera at origin looking down -Z
        cam_data = bpy.data.cameras.new("StudioCam")
        sensor_mm = cam_json.get("sensorMm", [36, 24])
        fov_deg = float(cam_json.get("fovDeg", 40.0))
        cam_data.sensor_fit = "VERTICAL"
        cam_data.sensor_width = float(sensor_mm[0])
        cam_data.sensor_height = float(sensor_mm[1])
        cam_data.lens = float(sensor_mm[1]) / (2.0 * math.tan(math.radians(fov_deg) / 2.0))
        cam_data.clip_start = float(cam_json.get("near", 0.001))
        cam_data.clip_end = float(cam_json.get("far", 1000000.0))

        if "focus" in cam_json and cam_json["focus"] is not None:
            cam_data.dof.use_dof = True
            cam_data.dof.focus_distance = float(cam_json["focus"])
            cam_data.dof.aperture_fstop = float(cam_json.get("fstop", 4.0))

        cam_obj = bpy.data.objects.new("StudioCam", cam_data)
        cam_obj.location = (0.0, 0.0, 0.0)
        cam_obj.rotation_euler = (0.0, 0.0, 0.0)
        bpy.context.scene.collection.objects.link(cam_obj)
        bpy.context.scene.camera = cam_obj

        # Add a gentle key light so materials without emissive show clearly
        light_data = bpy.data.lights.new(name="KeyLight", type="SUN")
        light_data.energy = 2.5
        light_obj = bpy.data.objects.new(name="KeyLight", object_data=light_data)
        light_obj.location = (1.0, 1.0, 2.0)
        bpy.context.scene.collection.objects.link(light_obj)

        # 3. Cycles settings
        scene = bpy.context.scene
        scene.render.engine = "CYCLES"
        scene.cycles.samples = int(args.samples)
        scene.cycles.use_denoising = bool(args.denoise)

        if args.device == "GPU":
            try:
                prefs = bpy.context.preferences.addons["cycles"].preferences
                prefs.get_devices()
                gpu_found = False
                for dev_type in ("OPTIX", "CUDA", "HIP", "ONEAPI", "METAL"):
                    try:
                        prefs.compute_device_type = dev_type
                        prefs.get_devices()
                        for d in prefs.devices:
                            if d.type != "CPU":
                                d.use = True
                                gpu_found = True
                        if gpu_found:
                            break
                    except Exception:
                        continue
                if gpu_found:
                    scene.cycles.device = "GPU"
                else:
                    scene.cycles.device = "CPU"
                    print("device fell back to CPU", flush=True)
            except Exception:
                scene.cycles.device = "CPU"
                print("device fell back to CPU", flush=True)
        else:
            scene.cycles.device = "CPU"

        # 4. World background and film
        scene.render.film_transparent = False
        world = bpy.data.worlds.new("StudioWorld")
        scene.world = world
        world.use_nodes = True
        bg_node = world.node_tree.nodes.get("Background")
        if bg_node:
            bg_node.inputs[0].default_value = hex_to_linear_rgb(cam_json.get("background", "#0F141C"))

        # 5. Render still
        scene.render.resolution_x = int(args.width)
        scene.render.resolution_y = int(args.height)
        scene.render.resolution_percentage = 100
        out_path.parent.mkdir(parents=True, exist_ok=True)
        scene.render.filepath = str(out_path)
        bpy.ops.render.render(write_still=True)

        elapsed = time.perf_counter() - t0
        print(f"RENDER_OK seconds={elapsed:.4f}", flush=True)
        sys.exit(0)
    except Exception as exc:
        print(f"RENDER_FAIL {exc}", flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
