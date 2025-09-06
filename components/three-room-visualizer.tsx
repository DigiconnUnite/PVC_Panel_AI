"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

interface ThreeRoomVisualizerProps {
  imageUrl: string
  masks: string[]
  selectedMaskIndex: number[]
  textureAssignments: { [key: number]: string } // mask index -> texture asset ID
  onTextureAssign: (maskIndex: number, textureId: string) => void
  className?: string
}

interface PBRMaterial {
  color: string
  normal: string
  roughness: string
  metallic: string
  ao?: string
  displacement?: string
}

const ThreeRoomVisualizer = ({
  imageUrl,
  masks,
  selectedMaskIndex,
  textureAssignments,
  onTextureAssign,
  className
}: ThreeRoomVisualizerProps) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const roomRef = useRef<THREE.Group | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const animationIdRef = useRef<number | null>(null)

  // Material cache to avoid reloading textures
  const materialCache = useRef<Map<string, THREE.MeshStandardMaterial>>(new Map())

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return

    const initThreeJS = async () => {
      try {
        // Scene setup
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xf0f0f0)
        sceneRef.current = scene

        // Camera setup
        const camera = new THREE.PerspectiveCamera(
          75,
          mountRef.current!.clientWidth / mountRef.current!.clientHeight,
          0.1,
          1000
        )
        camera.position.set(5, 5, 5)
        cameraRef.current = camera

        // Renderer setup with optimized settings
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          precision: "highp",
          stencil: false,
          depth: true
        })
        renderer.setSize(mountRef.current!.clientWidth, mountRef.current!.clientHeight)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.2
        renderer.outputColorSpace = THREE.SRGBColorSpace

        // Performance optimizations
        renderer.setClearColor(0xf0f0f0, 1)
        renderer.autoClear = true
        renderer.sortObjects = true
        rendererRef.current = renderer

        // Controls setup
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05
        controls.enableZoom = true
        controls.enablePan = true
        controls.minDistance = 2
        controls.maxDistance = 20
        controlsRef.current = controls

        // Lighting setup
        setupLighting(scene)

        // Environment setup
        await setupEnvironment(scene)

        // Create room geometry
        createRoom(scene)

        // Mount renderer
        mountRef.current!.appendChild(renderer.domElement)

        // Optimized animation loop
        const animate = () => {
          animationIdRef.current = requestAnimationFrame(animate)
          controls.update()
          renderer.render(scene, camera)
        }
        animationIdRef.current = requestAnimationFrame(animate)

        setIsLoading(false)

      } catch (err) {
        console.error('Three.js initialization error:', err)
        setError('Failed to initialize 3D visualization')
        setIsLoading(false)
      }
    }

    initThreeJS()

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }
      if (controlsRef.current) {
        controlsRef.current.dispose()
      }
      // Clear material cache
      materialCache.current.clear()
    }
  }, [])

  const setupLighting = (scene: THREE.Scene) => {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -10
    directionalLight.shadow.camera.right = 10
    directionalLight.shadow.camera.top = 10
    directionalLight.shadow.camera.bottom = -10
    scene.add(directionalLight)

    // Point lights for additional illumination
    const pointLight1 = new THREE.PointLight(0xffffff, 0.5, 10)
    pointLight1.position.set(-3, 3, 3)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xffffff, 0.3, 8)
    pointLight2.position.set(3, 2, -3)
    scene.add(pointLight2)
  }

  const setupEnvironment = async (scene: THREE.Scene) => {
    // Load HDRI environment map for realistic reflections
    const rgbeLoader = new RGBELoader()
    try {
      // For now, use a simple environment - in production, load actual HDRI
      const pmremGenerator = new THREE.PMREMGenerator(rendererRef.current!)
      const envMap = pmremGenerator.fromScene(new THREE.Scene()).texture
      scene.environment = envMap
      pmremGenerator.dispose()
    } catch (err) {
      console.warn('Failed to load environment map:', err)
    }
  }

  const createRoom = (scene: THREE.Scene) => {
    const roomGroup = new THREE.Group()
    roomRef.current = roomGroup

    // Room dimensions (will be estimated from image analysis)
    const roomWidth = 6
    const roomHeight = 3
    const roomDepth = 4

    // Create walls
    createWall(roomGroup, roomWidth, roomHeight, roomDepth, 'front')
    createWall(roomGroup, roomWidth, roomHeight, roomDepth, 'back')
    createWall(roomGroup, roomDepth, roomHeight, roomWidth, 'left')
    createWall(roomGroup, roomDepth, roomHeight, roomWidth, 'right')

    // Create floor
    createFloor(roomGroup, roomWidth, roomDepth)

    // Create ceiling
    createCeiling(roomGroup, roomWidth, roomDepth, roomHeight)

    scene.add(roomGroup)
  }

  const createWall = (
    parent: THREE.Group,
    width: number,
    height: number,
    depth: number,
    position: string
  ) => {
    // Optimize geometry with appropriate segment count
    const geometry = new THREE.PlaneGeometry(width, height, 1, 1)
    const material = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide
    })

    const wall = new THREE.Mesh(geometry, material)
    wall.receiveShadow = true
    wall.castShadow = false

    // Add frustum culling for performance
    wall.frustumCulled = true

    // Position walls
    switch (position) {
      case 'front':
        wall.position.set(0, height/2, depth/2)
        break
      case 'back':
        wall.position.set(0, height/2, -depth/2)
        wall.rotation.y = Math.PI
        break
      case 'left':
        wall.position.set(-width/2, height/2, 0)
        wall.rotation.y = Math.PI / 2
        break
      case 'right':
        wall.position.set(width/2, height/2, 0)
        wall.rotation.y = -Math.PI / 2
        break
    }

    parent.add(wall)
  }

  const createFloor = (parent: THREE.Group, width: number, depth: number) => {
    const geometry = new THREE.PlaneGeometry(width, depth, 1, 1)
    const material = new THREE.MeshStandardMaterial({
      color: 0xe8e8e8,
      roughness: 0.9,
      metalness: 0.0
    })

    const floor = new THREE.Mesh(geometry, material)
    floor.rotation.x = -Math.PI / 2
    floor.position.set(0, 0, 0)
    floor.receiveShadow = true
    floor.frustumCulled = true

    parent.add(floor)
  }

  const createCeiling = (parent: THREE.Group, width: number, depth: number, height: number) => {
    const geometry = new THREE.PlaneGeometry(width, depth, 1, 1)
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.0
    })

    const ceiling = new THREE.Mesh(geometry, material)
    ceiling.rotation.x = Math.PI / 2
    ceiling.position.set(0, height, 0)
    ceiling.receiveShadow = false
    ceiling.frustumCulled = true

    parent.add(ceiling)
  }

  const loadPBRMaterial = useCallback(async (textureId: string): Promise<THREE.MeshStandardMaterial | null> => {
    // Check cache first
    if (materialCache.current.has(textureId)) {
      return materialCache.current.get(textureId)!
    }

    try {
      // Load texture maps from API
      const response = await fetch('/api/textures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: textureId, mapType: 'color' })
      })

      if (!response.ok) {
        throw new Error('Failed to load texture')
      }

      const data = await response.json()
      const colorMapUrl = data.dataUrl

      if (!colorMapUrl) {
        throw new Error('No texture data available')
      }

      // Create texture loader
      const textureLoader = new THREE.TextureLoader()

      // Load color map
      const colorMap = await new Promise<THREE.Texture>((resolve, reject) => {
        textureLoader.load(
          colorMapUrl,
          resolve,
          undefined,
          reject
        )
      })

      // Configure texture with performance optimizations
      colorMap.wrapS = THREE.RepeatWrapping
      colorMap.wrapT = THREE.RepeatWrapping
      colorMap.repeat.set(2, 2)
      colorMap.generateMipmaps = true
      colorMap.minFilter = THREE.LinearMipmapLinearFilter
      colorMap.magFilter = THREE.LinearFilter
      colorMap.anisotropy = Math.min(rendererRef.current!.capabilities.getMaxAnisotropy(), 4)

      // Create PBR material
      const material = new THREE.MeshStandardMaterial({
        map: colorMap,
        roughness: 0.8,
        metalness: 0.0,
        envMapIntensity: 0.5
      })

      // Cache material
      materialCache.current.set(textureId, material)

      return material

    } catch (err) {
      console.error('Failed to load PBR material:', err)
      return null
    }
  }, [])

  // Update materials when texture assignments change
  useEffect(() => {
    if (!roomRef.current) return

    const updateMaterials = async () => {
      // Update wall materials based on assignments
      const walls = roomRef.current!.children.filter((child: THREE.Object3D) =>
        child.userData.type === 'wall'
      )

      for (let i = 0; i < walls.length; i++) {
        const wall = walls[i] as THREE.Mesh
        const maskIndex = wall.userData.maskIndex

        if (textureAssignments[maskIndex]) {
          const material = await loadPBRMaterial(textureAssignments[maskIndex])
          if (material) {
            wall.material = material
          }
        }
      }
    }

    updateMaterials()
  }, [textureAssignments, loadPBRMaterial])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current || !mountRef.current) return

      cameraRef.current.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-center text-red-500">
          <p className="text-lg font-medium">3D Visualization Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading 3D Room...</p>
          <p className="text-sm text-gray-500">Setting up realistic visualization</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mountRef} className="w-full h-full" />

      {/* 3D Controls Info */}
      <div className="absolute top-4 left-4 bg-black/70 text-white text-sm px-3 py-2 rounded-lg backdrop-blur-sm">
        <p>🖱️ Left click + drag: Rotate</p>
        <p>🔍 Scroll: Zoom</p>
        <p>⚡ Right click + drag: Pan</p>
      </div>

      {/* Material Assignment Panel */}
      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-xs">
        <h3 className="text-lg font-semibold mb-3">Surface Materials</h3>
        <div className="space-y-2">
          {selectedMaskIndex.map(index => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm">Surface {index + 1}</span>
              <select
                className="text-xs border rounded px-2 py-1"
                value={textureAssignments[index] || ''}
                onChange={(e) => onTextureAssign(index, e.target.value)}
              >
                <option value="">Default</option>
                <option value="WoodFloor051">Wood Floor</option>
                <option value="Concrete034">Concrete Wall</option>
                <option value="Bricks102">Brick Wall</option>
                <option value="Plaster001">Plaster Ceiling</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ThreeRoomVisualizer