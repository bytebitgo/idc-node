import * as THREE from 'three';
import { ServerStatus, ServerData } from './ServerStatus';

interface ServerBrand {
  name: string;
  color: number;
  logo?: string;
}

interface Infrastructure {
  type: 'network' | 'power' | 'cooling' | 'fiber';
  color: number;
  width: number;
}

export class DataCenter extends THREE.Group {
  private serverStatus: ServerStatus;
  private servers: Map<string, THREE.Mesh> = new Map();
  private racks: Map<number, THREE.Group> = new Map();
  private heatmapMaterial: THREE.ShaderMaterial;
  private selectedServer: THREE.Mesh | null = null;
  private hoveredRack: THREE.Group | null = null;
  private hoveredServer: THREE.Mesh | null = null;
  
  private serverBrands: ServerBrand[] = [
    { name: 'DELL', color: 0x0085c3 },
    { name: 'HP', color: 0x0096d6 },
    { name: '曙光', color: 0xff6b00 },
    { name: '浪潮', color: 0x00a0e9 },
    { name: '华为', color: 0xff0000 }
  ];

  private infrastructureTypes: Infrastructure[] = [
    { type: 'network', color: 0x4287f5, width: 0.03 }, // 蓝色网线
    { type: 'power', color: 0xff4444, width: 0.05 }, // 红色电源线
    { type: 'cooling', color: 0x42f5aa, width: 0.08 }, // 青色冷却管道
    { type: 'fiber', color: 0xf542f5, width: 0.02 }, // 紫色光纤
  ];

  constructor() {
    super();
    this.serverStatus = new ServerStatus();
    this.heatmapMaterial = this.createHeatmapMaterial();
    this.createFloor();
    this.createInfrastructure();
    this.createRacks();
  }

  private createHeatmapMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        temperature: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float temperature;
        varying vec2 vUv;
        
        vec3 colorFromTemp(float t) {
          vec3 cold = vec3(0.0, 0.0, 1.0);
          vec3 warm = vec3(1.0, 1.0, 0.0);
          vec3 hot = vec3(1.0, 0.0, 0.0);
          
          if(t < 0.5) {
            return mix(cold, warm, t * 2.0);
          } else {
            return mix(warm, hot, (t - 0.5) * 2.0);
          }
        }
        
        void main() {
          vec3 color = colorFromTemp(temperature);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
  }

  private createFloor(): void {
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      side: THREE.DoubleSide,
      roughness: 0.8,
      transparent: true,
      opacity: 0.8,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    this.add(floor);

    const gridHelper = new THREE.GridHelper(20, 20);
    this.add(gridHelper);

    const baseGeometry = new THREE.PlaneGeometry(20, 20);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      side: THREE.DoubleSide,
      roughness: 1,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.2;
    this.add(base);
  }

  private createInfrastructure(): void {
    this.createMainInfrastructure();
    this.createRackConnections();
  }

  private createMainInfrastructure(): void {
    const mainPathsNS = [
      { x: -3, z: 0 },
      { x: 0, z: 0 },
      { x: 3, z: 0 },
    ];

    const mainPathsEW = [
      { x: 0, z: -3 },
      { x: 0, z: 0 },
      { x: 0, z: 3 },
    ];

    mainPathsNS.forEach(path => {
      this.infrastructureTypes.forEach((infra, index) => {
        const curve = new THREE.LineCurve3(
          new THREE.Vector3(path.x - 0.2 + index * 0.1, -0.15, -4),
          new THREE.Vector3(path.x - 0.2 + index * 0.1, -0.15, 4)
        );
        this.createPipe(curve, infra);
      });
    });

    mainPathsEW.forEach(path => {
      this.infrastructureTypes.forEach((infra, index) => {
        const curve = new THREE.LineCurve3(
          new THREE.Vector3(-4, -0.15 - index * 0.05, path.z),
          new THREE.Vector3(4, -0.15 - index * 0.05, path.z)
        );
        this.createPipe(curve, infra);
      });
    });
  }

  private createRackConnections(): void {
    for (let rackIndex = 0; rackIndex < 9; rackIndex++) {
      const rack = this.racks.get(rackIndex);
      if (rack) {
        const rackPos = rack.position;
        const mainLineX = Math.round(rackPos.x);
        const mainLineZ = Math.round(rackPos.z);

        this.infrastructureTypes.forEach((infra, index) => {
          const verticalCurve = new THREE.LineCurve3(
            new THREE.Vector3(rackPos.x - 0.2 + index * 0.1, -0.15, mainLineZ),
            new THREE.Vector3(rackPos.x - 0.2 + index * 0.1, 0, mainLineZ)
          );
          this.createPipe(verticalCurve, infra, 0.5);

          const horizontalCurve = new THREE.LineCurve3(
            new THREE.Vector3(mainLineX, -0.15, rackPos.z - 0.2 + index * 0.1),
            new THREE.Vector3(rackPos.x, -0.15, rackPos.z - 0.2 + index * 0.1)
          );
          this.createPipe(horizontalCurve, infra, 0.5);
        });
      }
    }
  }

  private createPipe(curve: THREE.LineCurve3, infrastructure: Infrastructure, opacity: number = 1): void {
    const geometry = new THREE.TubeGeometry(curve, 1, infrastructure.width, 8, false);
    const material = new THREE.MeshStandardMaterial({
      color: infrastructure.color,
      metalness: 0.5,
      roughness: 0.5,
      transparent: true,
      opacity: opacity,
    });
    const pipe = new THREE.Mesh(geometry, material);
    pipe.userData.type = infrastructure.type;
    this.add(pipe);
  }

  private createRacks(): void {
    const rackPositions = [
      [-3, 0, -3],
      [-3, 0, 0],
      [-3, 0, 3],
      [0, 0, -3],
      [0, 0, 0],
      [0, 0, 3],
      [3, 0, -3],
      [3, 0, 0],
      [3, 0, 3],
    ];

    rackPositions.forEach((position, rackIndex) => {
      const rack = this.createRack(rackIndex);
      rack.position.set(position[0], position[1], position[2]);
      this.racks.set(rackIndex, rack);
      this.add(rack);
    });
  }

  private createRack(rackIndex: number): THREE.Group {
    const rack = new THREE.Group();
    rack.userData.rackIndex = rackIndex;

    const rackGeometry = new THREE.BoxGeometry(0.8, 2, 0.8);
    const rackMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 1,
    });
    const rackMesh = new THREE.Mesh(rackGeometry, rackMaterial);
    rackMesh.position.y = 1;
    rackMesh.userData.isRackCase = true;
    rack.add(rackMesh);

    const serverCount = 5;
    const serverHeight = 1.6 / serverCount;
    const serverWidth = 0.75;
    const serverDepth = 0.75;
    const serverSpacing = 0.02;

    for (let i = 0; i < serverCount; i++) {
      const serverId = `rack${rackIndex}-server${i}`;
      const brand = this.serverBrands[i];
      
      const serverGroup = new THREE.Group();
      serverGroup.position.y = 0.2 + i * serverHeight + serverHeight / 2;
      
      const serverGeometry = new THREE.BoxGeometry(
        serverWidth,
        serverHeight - serverSpacing,
        serverDepth
      );
      
      const serverMaterial = this.heatmapMaterial.clone();
      const server = new THREE.Mesh(serverGeometry, serverMaterial);
      server.userData.id = serverId;
      server.userData.brand = brand.name;
      serverGroup.add(server);
      this.servers.set(serverId, server);

      const lightGeometry = new THREE.BoxGeometry(0.04, 0.04, 0.04);
      const lightMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      light.position.set(serverWidth / 2 - 0.05, 0, serverDepth / 2 + 0.02);
      server.add(light);

      const panelGeometry = new THREE.PlaneGeometry(serverWidth * 0.95, serverHeight * 0.8);
      const panelMaterial = new THREE.MeshStandardMaterial({
        color: brand.color,
        metalness: 0.5,
        roughness: 0.5,
      });
      const panel = new THREE.Mesh(panelGeometry, panelMaterial);
      panel.position.z = serverDepth / 2 + 0.001;
      serverGroup.add(panel);

      const textGeometry = new THREE.PlaneGeometry(serverWidth * 0.4, serverHeight * 0.2);
      const textMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
      });
      const textPlane = new THREE.Mesh(textGeometry, textMaterial);
      textPlane.position.z = serverDepth / 2 + 0.002;
      serverGroup.add(textPlane);

      const ventsGeometry = new THREE.PlaneGeometry(serverWidth * 0.8, serverHeight * 0.3);
      const ventsMaterial = new THREE.MeshPhongMaterial({
        color: 0x222222,
        shininess: 0,
        bumpScale: 0.002,
      });
      const vents = new THREE.Mesh(ventsGeometry, ventsMaterial);
      vents.position.z = serverDepth / 2 + 0.001;
      vents.position.y = -serverHeight / 4;
      serverGroup.add(vents);

      rack.add(serverGroup);
    }

    return rack;
  }

  public update(): void {
    this.serverStatus.updateServerStatus();
    
    this.servers.forEach((serverMesh, id) => {
      const data = this.serverStatus.getServerData(id);
      if (data && serverMesh) {
        const material = serverMesh.material as THREE.ShaderMaterial;
        if (material && material.uniforms) {
          material.uniforms.temperature.value = (data.temperature - 20) / 30;
        }

        const light = serverMesh.children[0];
        if (light) {
          const lightMaterial = light.material as THREE.MeshBasicMaterial;
          if (lightMaterial) {
            switch (data.status) {
              case 'normal':
                lightMaterial.color.setHex(0x00ff00);
                break;
              case 'warning':
                lightMaterial.color.setHex(0xffff00);
                break;
              case 'error':
                lightMaterial.color.setHex(0xff0000);
                break;
            }
          }
        }
      }
    });
  }

  public handleMouseMove(raycaster: THREE.Raycaster, camera: THREE.Camera): void {
    if (this.hoveredRack) {
      const rackCase = this.hoveredRack.children.find(child => child.userData.isRackCase) as THREE.Mesh;
      if (rackCase) {
        (rackCase.material as THREE.MeshStandardMaterial).opacity = 1;
      }
    }
    if (this.hoveredServer && this.hoveredServer !== this.selectedServer) {
      const material = this.hoveredServer.material as THREE.ShaderMaterial;
      material.wireframe = false;
    }

    const interactiveObjects: THREE.Object3D[] = [];
    this.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.userData.id || child.userData.isRackCase) {
          interactiveObjects.push(child);
        }
      }
    });

    const intersects = raycaster.intersectObjects(interactiveObjects, true);
    
    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object as THREE.Mesh;
      
      let targetObject = intersectedObject;
      let parent = intersectedObject.parent;
      while (parent && !(parent instanceof THREE.Group && parent.userData.rackIndex !== undefined)) {
        if (parent instanceof THREE.Mesh && parent.userData.id) {
          targetObject = parent;
          break;
        }
        if (parent instanceof THREE.Group && parent.userData.id) {
          const serverMesh = this.servers.get(parent.userData.id);
          if (serverMesh) {
            targetObject = serverMesh;
            break;
          }
        }
        parent = parent.parent;
      }

      if (targetObject.userData.isRackCase) {
        const rack = targetObject.parent as THREE.Group;
        this.hoveredRack = rack;
        (targetObject.material as THREE.MeshStandardMaterial).opacity = 0.7;
        this.showRackInfo(rack.userData.rackIndex);
      } else if (targetObject.userData.id) {
        this.hoveredServer = targetObject;
        if (this.hoveredServer !== this.selectedServer) {
          const material = targetObject.material as THREE.ShaderMaterial;
          material.wireframe = true;
        }
        const serverData = this.serverStatus.getServerData(targetObject.userData.id);
        if (serverData) {
          this.showServerInfo(serverData);
        }
      }
    } else {
      this.hoveredRack = null;
      this.hoveredServer = null;
      this.showDefaultInfo();
    }
  }

  public handleClick(raycaster: THREE.Raycaster, camera: THREE.Camera): void {
    const serverMeshes: THREE.Object3D[] = [];
    this.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.id) {
        serverMeshes.push(child);
      }
    });

    const intersects = raycaster.intersectObjects(serverMeshes);
    
    if (intersects.length > 0) {
      const clickedObject = intersects[0].object as THREE.Mesh;
      const serverId = clickedObject.userData.id;
      
      if (serverId) {
        const serverData = this.serverStatus.getServerData(serverId);
        if (serverData) {
          if (this.selectedServer) {
            const material = this.selectedServer.material as THREE.ShaderMaterial;
            material.wireframe = false;
          }

          this.selectedServer = clickedObject;
          const material = clickedObject.material as THREE.ShaderMaterial;
          material.wireframe = true;

          this.showServerInfo(serverData);
        }
      }
    }
  }

  private showRackInfo(rackIndex: number): void {
    const infoElement = document.getElementById('info');
    if (infoElement) {
      let serverList = '';
      for (let i = 0; i < 5; i++) {
        const serverId = `rack${rackIndex}-server${i}`;
        const server = this.servers.get(serverId);
        const brand = server?.userData.brand || '未知品牌';
        const data = this.serverStatus.getServerData(serverId);
        if (data) {
          const statusColor = this.getStatusColor(data.status);
          serverList += `
            <div style="margin: 5px 0; padding: 5px; border-left: 3px solid ${statusColor}">
              <strong>${brand}</strong> - ${serverId}<br>
              <small>温度: ${data.temperature.toFixed(1)}°C | CPU: ${data.cpuUsage.toFixed(1)}%</small>
            </div>
          `;
        }
      }

      infoElement.innerHTML = `
        <div style="background: rgba(0, 0, 0, 0.7); padding: 10px; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0;">机柜 #${rackIndex + 1} 服务器列表</h3>
          ${serverList}
        </div>
      `;
    }
  }

  private showDefaultInfo(): void {
    const infoElement = document.getElementById('info');
    if (infoElement) {
      infoElement.innerHTML = `
        <div style="background: rgba(0, 0, 0, 0.7); padding: 10px; border-radius: 5px;">
          <h3 style="margin: 0;">数据中心概览</h3>
          <p>请将鼠标移到机柜或服务器上查看详细信息</p>
          <div style="margin-top: 10px;">
            <p>基础设施图例：</p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 20px; height: 10px; background: #4287f5; margin-right: 5px;"></span>
                <span>网络线缆</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 20px; height: 10px; background: #ff4444; margin-right: 5px;"></span>
                <span>电源线路</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 20px; height: 10px; background: #42f5aa; margin-right: 5px;"></span>
                <span>冷却管道</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 20px; height: 10px; background: #f542f5; margin-right: 5px;"></span>
                <span>光纤线路</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  private showServerInfo(data: ServerData): void {
    const infoElement = document.getElementById('info');
    if (infoElement) {
      const server = this.servers.get(data.id);
      const brandName = server?.userData.brand || '未知品牌';
      
      infoElement.innerHTML = `
        <div style="background: rgba(0, 0, 0, 0.7); padding: 10px; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0;">服务器信息</h3>
          <p>品牌: ${brandName}</p>
          <p>ID: ${data.id}</p>
          <p>温度: <span style="color: ${this.getTemperatureColor(data.temperature)}">${data.temperature.toFixed(1)}°C</span></p>
          <p>CPU使用率: <span style="color: ${this.getUsageColor(data.cpuUsage)}">${data.cpuUsage.toFixed(1)}%</span></p>
          <p>内存使用率: <span style="color: ${this.getUsageColor(data.memoryUsage)}">${data.memoryUsage.toFixed(1)}%</span></p>
          <p>状态: <span style="color: ${this.getStatusColor(data.status)}">${data.status}</span></p>
        </div>
      `;
    }
  }

  private getTemperatureColor(temp: number): string {
    if (temp > 45) return '#ff4444';
    if (temp > 35) return '#ffaa00';
    return '#44ff44';
  }

  private getUsageColor(usage: number): string {
    if (usage > 90) return '#ff4444';
    if (usage > 70) return '#ffaa00';
    return '#44ff44';
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'error': return '#ff4444';
      case 'warning': return '#ffaa00';
      case 'normal': return '#44ff44';
      default: return '#ffffff';
    }
  }
} 