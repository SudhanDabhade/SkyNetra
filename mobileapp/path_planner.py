import math
import heapq

# --- GEOSPATIAL UTILS ---
def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

class PathPlanner:
    def __init__(self, resolution=30, margin_km=1.0, safety_buffer=50):
        self.resolution = resolution  # Meters per grid cell
        self.margin = margin_km * 1000  # Margin around the bounding box in meters
        self.safety_buffer = safety_buffer # Safety buffer around NFZ in meters

    def _get_bounding_box(self, start, end, nfz_list):
        lats = [start[0], end[0]] + [z['lat'] for z in nfz_list]
        lons = [start[1], end[1]] + [z['lng'] for z in nfz_list]
        
        # Add a bit of padding to the bounds
        min_lat, max_lat = min(lats) - 0.02, max(lats) + 0.02
        min_lon, max_lon = min(lons) - 0.02, max(lons) + 0.02
        return min_lat, min_lon, max_lat, max_lon

    def latlon_to_grid(self, lat, lon, min_lat, min_lon):
        # Rough approximation: 1 deg lat = 111320m, 1 deg lon = 111320 * cos(lat)m
        y = haversine_distance(min_lat, lon, lat, lon)
        x = haversine_distance(lat, min_lon, lat, lon)
        return int(x / self.resolution), int(y / self.resolution)

    def grid_to_latlon(self, gx, gy, min_lat, min_lon):
        # Inverse approximation
        lat = min_lat + (gy * self.resolution) / 111320.0
        lon = min_lon + (gx * self.resolution) / (111320.0 * math.cos(math.radians(lat)))
        return lat, lon

    def compute_drone_path(self, start_lat, start_lon, end_lat, end_lon, nfz_list):
        # 1. Setup Grid Bounds
        min_lat, min_lon, max_lat, max_lon = self._get_bounding_box((start_lat, start_lon), (end_lat, end_lon), nfz_list)
        
        start_grid = self.latlon_to_grid(start_lat, start_lon, min_lat, min_lon)
        end_grid = self.latlon_to_grid(end_lat, end_lon, min_lat, min_lon)
        
        width = self.latlon_to_grid(max_lat, max_lon, min_lat, min_lon)[0] + 10
        height = self.latlon_to_grid(max_lat, max_lon, min_lat, min_lon)[1] + 10

        # 2. Pre-calculate NFZ proximity and blocked cells
        # We don't store the whole grid to save memory, we calculate costs on the fly
        # but for performance we pre-process NFZ impact areas.
        nfz_processed = []
        for zone in nfz_list:
            gx, gy = self.latlon_to_grid(zone['lat'], zone['lng'], min_lat, min_lon)
            r_grid = zone['radius'] * 1000 / self.resolution
            b_grid = self.safety_buffer / self.resolution
            nfz_processed.append({'x': gx, 'y': gy, 'r': r_grid, 'b': b_grid})

        def get_cost(x, y, prev_x, prev_y, pprev_x, pprev_y):
            # Base distance cost (1.0 for straight, 1.414 for diagonal)
            dist = math.sqrt((x - prev_x)**2 + (y - prev_y)**2)
            
            # Turning penalty
            turn_penalty = 0
            if pprev_x is not None:
                # Direction vectors
                v1 = (prev_x - pprev_x, prev_y - pprev_y)
                v2 = (x - prev_x, y - prev_y)
                if v1 != v2:
                    turn_penalty = 2.0 # Fixed penalty for any turn

            # NFZ Obstacle & Proximity Penalty
            prox_penalty = 0
            for nfz in nfz_processed:
                d = math.sqrt((x - nfz['x'])**2 + (y - nfz['y'])**2)
                if d <= (nfz['r'] + nfz['b']):
                    return float('inf') # BLOCKED
                
                # Proximity penalty: increases as we get closer to the buffer edge
                # Influence range: 2x the safety buffer
                influence_range = nfz['b'] * 3 
                if d < (nfz['r'] + nfz['b'] + influence_range):
                    prox_penalty += (1.0 - (d - (nfz['r'] + nfz['b'])) / influence_range) * 10.0

            return dist + turn_penalty + prox_penalty

        # 3. A* Algorithm
        open_set = []
        # (f_score, x, y, p_x, p_y) -> p_x, p_y is parent for reconstruction
        heapq.heappush(open_set, (0, start_grid[0], start_grid[1], None, None))
        
        g_score = {start_grid: 0}
        came_from = {}
        
        # Directions: 8-way movement
        directions = [(0, 1), (1, 0), (0, -1), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)]

        while open_set:
            f, x, y, px, py = heapq.heappop(open_set)
            
            if (x, y) == end_grid:
                # Reconstruction
                path = []
                curr = (x, y)
                while curr in came_from:
                    path.append(curr)
                    curr = came_from[curr]
                path.append(start_grid)
                path.reverse()
                
                # 4. Smoothing & GPS Conversion
                return self._smooth_and_convert(path, min_lat, min_lon, nfz_processed)

            for dx, dy in directions:
                nx, ny = x + dx, y + dy
                
                # Boundary check
                if nx < 0 or ny < 0 or nx >= width or ny >= height:
                    continue
                
                ppx, ppy = came_from.get((x, y), (None, None))
                step_cost = get_cost(nx, ny, x, y, ppx, ppy)
                
                if step_cost == float('inf'):
                    continue
                    
                tentative_g = g_score[(x, y)] + step_cost
                
                if (nx, ny) not in g_score or tentative_g < g_score[(nx, ny)]:
                    came_from[(nx, ny)] = (x, y)
                    g_score[(nx, ny)] = tentative_g
                    h = math.sqrt((nx - end_grid[0])**2 + (ny - end_grid[1])**2)
                    heapq.heappush(open_set, (tentative_g + h, nx, ny, x, y))
        
        return [] # No path found

    def _is_line_clear(self, p1, p2, nfz_processed):
        # Bresenham's or simple sampling to check if line between p1 and p2 is clear
        steps = int(math.sqrt((p2[0]-p1[0])**2 + (p2[1]-p1[1])**2)) * 2
        if steps == 0: return True
        for i in range(steps + 1):
            t = i / steps
            x = p1[0] + t * (p2[0] - p1[0])
            y = p1[1] + t * (p2[1] - p1[1])
            for nfz in nfz_processed:
                if math.sqrt((x - nfz['x'])**2 + (y - nfz['y'])**2) <= (nfz['r'] + nfz['b']):
                    return False
        return True

    def _smooth_and_convert(self, path, min_lat, min_lon, nfz_processed):
        if not path: return []
        
        # Simple path smoothing: Remove intermediate nodes if direct line is clear
        smoothed = [path[0]]
        curr_idx = 0
        while curr_idx < len(path) - 1:
            next_idx = len(path) - 1
            while next_idx > curr_idx + 1:
                if self._is_line_clear(path[curr_idx], path[next_idx], nfz_processed):
                    break
                next_idx -= 1
            smoothed.append(path[next_idx])
            curr_idx = next_idx

        # Convert grid points back to GPS
        gps_path = [self.grid_to_latlon(p[0], p[1], min_lat, min_lon) for p in smoothed]
        return gps_path

# Export function for global use
def compute_drone_path(start_lat, start_lon, end_lat, end_lon, nfz_list):
    planner = PathPlanner()
    return planner.compute_drone_path(start_lat, start_lon, end_lat, end_lon, nfz_list)