import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { DataCenter } from './DataCenter';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private dataCenter: DataCenter;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  constructor() {
    // 创建场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    // 创建相机
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(5, 5, 5);

    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    // 添加轨道控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // 添加环境光和方向光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // 创建数据中心
    this.dataCenter = new DataCenter();
    this.scene.add(this.dataCenter);

    // 添加坐标轴辅助
    const axesHelper = new THREE.AxesHelper(5);
    this.scene.add(axesHelper);

    // 初始化射线投射器和鼠标位置
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // 添加事件监听
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('click', this.onClick.bind(this));

    // 开始动画循环
    this.animate();
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(event: MouseEvent): void {
    // 计算鼠标在归一化设备坐标中的位置
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 更新射线投射器
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 处理鼠标移动事件
    this.dataCenter.handleMouseMove(this.raycaster, this.camera);
  }

  private onClick(event: MouseEvent): void {
    // 计算鼠标在归一化设备坐标中的位置
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 更新射线投射器
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 处理点击事件
    this.dataCenter.handleClick(this.raycaster, this.camera);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.dataCenter.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// 启动应用
new App(); 